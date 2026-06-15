using InnoTrack.Application.DTOs.Chat;
using InnoTrack.Application.Interfaces;
using InnoTrack.Domain.Entities;
using InnoTrack.Domain.Entities.Enums;
using InnoTrack.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace InnoTrack.Application.Services
{
    public class ChatService : IChatService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ChatService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<TeamChatDto> GetTeamChatAsync(int userId)
        {
            var teamMember = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId);
            if (teamMember == null)
                throw new InvalidOperationException("You are not in a team.");

            var chatRoom = await _unitOfWork.Repository<ChatRoom>()
                .FindAsync(c => c.TeamId == teamMember.TeamId);
            if (chatRoom == null)
                throw new KeyNotFoundException("Chat room not found.");

            var project = await _unitOfWork.Repository<Project>()
                .FindAsync(p => p.TeamId == teamMember.TeamId);

            var allMembers = await _unitOfWork.Repository<TeamMember>()
                .GetQueryable()
                .Include(tm => tm.Student)
                .Where(tm => tm.TeamId == teamMember.TeamId)
                .ToListAsync();

            var memberDtos = allMembers
                    .Where(m => m.Student != null)
                    .Select(member =>
                    {
                        var initials = $"{member.Student!.FirstName[0]}{member.Student.LastName[0]}".ToUpperInvariant();
                        return new ChatMemberDto(member.StudentId, member.Student.FullName, member.Role.ToString(), initials, member.Student.ProfilePictureURL, member.Student.LastOnlineAt);
                    }).ToList();

            var team = await _unitOfWork.Repository<Team>()
                .GetQueryable()
                .Include(t => t.Supervisor)
                .FirstOrDefaultAsync(t => t.Id == teamMember.TeamId);

            if (team?.Supervisor != null)
            {
                var profInitials = $"{team.Supervisor.FirstName[0]}{team.Supervisor.LastName[0]}".ToUpperInvariant();
                memberDtos.Add(new ChatMemberDto(team.ProfessorId!.Value, team.Supervisor.FullName, "Professor", profInitials, team.Supervisor.ProfilePictureURL, team.Supervisor.LastOnlineAt));
            }

            var hiddenMessageIds = await _unitOfWork.Repository<ChatMessageHidden>()
                .GetQueryable()
                .Where(h => h.UserId == userId)
                .Select(h => h.ChatMessageId)
                .ToListAsync();

            var messages = await _unitOfWork.Repository<ChatMessage>()
                .GetQueryable()
                .Where(m => m.ChatRoomId == chatRoom.Id && !hiddenMessageIds.Contains(m.Id))
                .Include(m => m.Sender)
                .Include(m => m.Attachments)
                .OrderByDescending(m => m.SentAt)
                .Take(50)
                .ToListAsync();

            var messageIds = messages.Select(m => m.Id).ToList();
            var reactions = await _unitOfWork.Repository<ChatMessageReaction>()
                .GetQueryable()
                .Where(r => messageIds.Contains(r.ChatMessageId))
                .ToListAsync();

            messages.Reverse();

            var messageDtos = messages.Select(msg => new ChatMessageDetailDto(
                msg.Id,
                msg.SenderId,
                msg.Sender?.FullName ?? "Unknown",
                msg.Content,
                msg.SentAt,
                msg.IsEdited,
                msg.IsDeletedForAll,
                msg.IsPinned,
                msg.ParentMessageId,
                reactions.Where(r => r.ChatMessageId == msg.Id)
                         .Select(r => new ChatMessageReactionDto(r.UserId, r.Emoji))
                         .ToList(),
                msg.Attachments.FirstOrDefault() != null ? new ChatMessageAttachmentDto(
                    msg.Attachments.First().FileName,
                    msg.Attachments.First().FileName.Contains("_") ? msg.Attachments.First().FileName.Substring(msg.Attachments.First().FileName.IndexOf("_") + 1) : msg.Attachments.First().FileName,
                    msg.Attachments.First().FileType ?? "application/octet-stream",
                    msg.Attachments.First().FileSize
                ) : null
            )).ToList();

            return new TeamChatDto(
                chatRoom.Id,
                project?.Title,
                memberDtos.AsReadOnly(),
                messageDtos.AsReadOnly()
            );
        }

        public async Task<ChatMessageResponseDto> SendMessageAsync(int userId, string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("Message content cannot be empty.");

            if (content.Length > 2000)
                throw new ArgumentException("Message cannot exceed 2000 characters.");

            var teamMember = await _unitOfWork.Repository<TeamMember>()
                .FindAsync(tm => tm.StudentId == userId);
            if (teamMember == null)
                throw new InvalidOperationException("You are not in a team.");

            var chatRoom = await _unitOfWork.Repository<ChatRoom>()
                .FindAsync(c => c.TeamId == teamMember.TeamId);
            if (chatRoom == null)
                throw new KeyNotFoundException("Chat room not found.");

            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId)
                ?? throw new KeyNotFoundException("User not found.");

            var message = new ChatMessage
            {
                ChatRoomId = chatRoom.Id,
                SenderId = userId,
                Content = content,
                Type = MessageType.Text,
                SentAt = DateTime.UtcNow,
            };

            await _unitOfWork.Repository<ChatMessage>().AddAsync(message);
            await _unitOfWork.CompleteAsync();

            return new ChatMessageResponseDto(message.Id, chatRoom.TeamId, userId, user.FullName, message.Content, message.SentAt);
        }

        private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".zip"
        };
        private static readonly long MaxFileSizeBytes = 25 * 1024 * 1024;
        public async Task<ChatMessageResponseDto> UploadTeamChatFileAsync(
            Stream fileStream, string fileName, string contentType, long fileSize, int teamId, int senderId)
        {
            var safeFileName = Path.GetFileName(fileName);
            var extension = Path.GetExtension(safeFileName).ToLowerInvariant();

            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException($"File type '{extension}' is not allowed in chat.");

            if (fileSize > MaxFileSizeBytes)
                throw new ArgumentException("File exceeds the maximum allowed size of 25 MB.");

            var chatRoom = await _unitOfWork.Repository<ChatRoom>()
                .FindAsync(c => c.TeamId == teamId);
            if (chatRoom == null)
                throw new KeyNotFoundException("Chat room not found for this team.");

            var user = await _unitOfWork.Repository<User>().GetByIdAsync(senderId)
                ?? throw new KeyNotFoundException("User not found.");

            var uniqueFileName = $"{Guid.NewGuid()}_{safeFileName}";
            var chatUploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "chat-uploads");
            if (!Directory.Exists(chatUploadsFolder))
                Directory.CreateDirectory(chatUploadsFolder);

            var filePath = Path.Combine(chatUploadsFolder, uniqueFileName);

            using (var fileStreamOutput = new FileStream(filePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(fileStreamOutput);
            }

            var fileUrl = $"/api/chat/files/{uniqueFileName}";

            var chatMessage = new ChatMessage
            {
                ChatRoomId = chatRoom.Id,
                SenderId = senderId,
                Content = safeFileName,
                Type = MessageType.File,
                SentAt = DateTime.UtcNow
            };

            await _unitOfWork.Repository<ChatMessage>().AddAsync(chatMessage);
            await _unitOfWork.CompleteAsync();

            var attachment = new ChatMessageAttachment
            {
                FileName = uniqueFileName,
                FileType = contentType,
                FileSize = fileSize,
                FileUrl = fileUrl,
                ChatMessageId = chatMessage.Id
            };

            await _unitOfWork.Repository<ChatMessageAttachment>().AddAsync(attachment);
            await _unitOfWork.CompleteAsync();

            var attachmentDto = new ChatMessageAttachmentDto(
                uniqueFileName,
                safeFileName,
                contentType,
                fileSize
            );

            return new ChatMessageResponseDto(
                chatMessage.Id,
                chatRoom.TeamId,
                senderId,
                user.FullName,
                chatMessage.Content,
                chatMessage.SentAt,
                Attachment: attachmentDto
            );
        }

        public async Task<(string FilePath, string ContentType, string DownloadName)> GetChatFileAsync(string fileName, int userId)
        {
            var attachment = await _unitOfWork.Repository<ChatMessageAttachment>()
                .GetQueryable()
                .Include(a => a.ChatMessage)
                .ThenInclude(m => m.ChatRoom)
                .FirstOrDefaultAsync(a => a.FileName == fileName);

            if (attachment == null)
                throw new KeyNotFoundException("File not found in database.");

            var chatMessage = attachment.ChatMessage;
            var chatRoom = chatMessage.ChatRoom;

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(chatRoom.TeamId);
            if (team == null) throw new KeyNotFoundException("Team not found.");

            bool isAuthorized = false;

            if (team.ProfessorId == userId)
            {
                isAuthorized = true;
            }
            else
            {
                var isMember = await _unitOfWork.Repository<TeamMember>()
                    .FindAsync(tm => tm.TeamId == team.Id && tm.StudentId == userId);
                if (isMember != null) isAuthorized = true;
            }

            if (!isAuthorized)
                throw new UnauthorizedAccessException("You are not authorized to download this file.");

            var chatUploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "chat-uploads");
            var physicalPath = Path.Combine(chatUploadsFolder, attachment.FileName);

            if (!File.Exists(physicalPath))
                throw new FileNotFoundException("The physical file does not exist on the server.");

            var originalName = chatMessage.Content ?? attachment.FileName;

            return (physicalPath, attachment.FileType ?? "application/octet-stream", originalName);
        }
        public async Task<ChatMessageResponseDto> ReplyToMessageAsync(int userId, int parentMessageId, string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("Message content cannot be empty.");

            var teamMember = await _unitOfWork.Repository<TeamMember>().FindAsync(tm => tm.StudentId == userId);
            if (teamMember == null) throw new InvalidOperationException("You are not in a team.");

            var chatRoom = await _unitOfWork.Repository<ChatRoom>().FindAsync(c => c.TeamId == teamMember.TeamId);
            if (chatRoom == null) throw new KeyNotFoundException("Chat room not found.");

            var user = await _unitOfWork.Repository<User>().GetByIdAsync(userId) ?? throw new KeyNotFoundException("User not found.");

            var parentMessage = await _unitOfWork.Repository<ChatMessage>().GetByIdAsync(parentMessageId);
            if (parentMessage == null || parentMessage.ChatRoomId != chatRoom.Id)
                throw new KeyNotFoundException("Parent message not found.");

            var message = new ChatMessage
            {
                ChatRoomId = chatRoom.Id,
                SenderId = userId,
                Content = content,
                Type = MessageType.Text,
                SentAt = DateTime.UtcNow,
                ParentMessageId = parentMessageId
            };

            await _unitOfWork.Repository<ChatMessage>().AddAsync(message);
            await _unitOfWork.CompleteAsync();

            return new ChatMessageResponseDto(message.Id, chatRoom.TeamId, userId, user.FullName, message.Content, message.SentAt, ParentMessageId: parentMessageId);
        }

        public async Task EditMessageAsync(int userId, int messageId, string newContent)
        {
            if (string.IsNullOrWhiteSpace(newContent)) throw new ArgumentException("Content cannot be empty.");

            var message = await _unitOfWork.Repository<ChatMessage>().GetByIdAsync(messageId)
                ?? throw new KeyNotFoundException("Message not found.");

            if (message.SenderId != userId) throw new UnauthorizedAccessException("Cannot edit someone else's message.");
            
            message.Content = newContent;
            message.IsEdited = true;

            _unitOfWork.Repository<ChatMessage>().Update(message);
            await _unitOfWork.CompleteAsync();
        }

        public async Task DeleteMessageAsync(int userId, int messageId, bool deleteForAll)
        {
            var message = await _unitOfWork.Repository<ChatMessage>().GetByIdAsync(messageId)
                ?? throw new KeyNotFoundException("Message not found.");

            if (deleteForAll)
            {
                if (message.SenderId != userId) throw new UnauthorizedAccessException("Cannot delete someone else's message for all.");
                message.IsDeletedForAll = true;
                message.Content = "This message was deleted";
                _unitOfWork.Repository<ChatMessage>().Update(message);
            }
            else
            {
                var hidden = new ChatMessageHidden { ChatMessageId = messageId, UserId = userId };
                await _unitOfWork.Repository<ChatMessageHidden>().AddAsync(hidden);
            }

            await _unitOfWork.CompleteAsync();
        }

        public async Task TogglePinMessageAsync(int userId, int messageId)
        {
            var message = await _unitOfWork.Repository<ChatMessage>().GetByIdAsync(messageId)
                ?? throw new KeyNotFoundException("Message not found.");

            // Verify user is in the same chat room
            var teamMember = await _unitOfWork.Repository<TeamMember>().FindAsync(tm => tm.StudentId == userId);
            if (teamMember == null) throw new UnauthorizedAccessException();
            
            var chatRoom = await _unitOfWork.Repository<ChatRoom>().FindAsync(c => c.TeamId == teamMember.TeamId);
            if (chatRoom == null || chatRoom.Id != message.ChatRoomId) throw new UnauthorizedAccessException();

            message.IsPinned = !message.IsPinned;
            _unitOfWork.Repository<ChatMessage>().Update(message);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ReactToMessageAsync(int userId, int messageId, string emoji)
        {
            var existingReaction = await _unitOfWork.Repository<ChatMessageReaction>()
                .FindAsync(r => r.ChatMessageId == messageId && r.UserId == userId && r.Emoji == emoji);

            if (existingReaction != null)
            {
                _unitOfWork.Repository<ChatMessageReaction>().Delete(existingReaction);
            }
            else
            {
                var reaction = new ChatMessageReaction { ChatMessageId = messageId, UserId = userId, Emoji = emoji };
                await _unitOfWork.Repository<ChatMessageReaction>().AddAsync(reaction);
            }
            await _unitOfWork.CompleteAsync();
        }

        public async Task<TeamChatDto> GetTeamChatForProfessorAsync(int professorId, int teamId)
        {
            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(teamId);
            if (team == null || team.ProfessorId != professorId)
                throw new UnauthorizedAccessException("You are not authorized to view this chat.");

            var chatRoom = await _unitOfWork.Repository<ChatRoom>().FindAsync(c => c.TeamId == teamId);
            if (chatRoom == null) throw new KeyNotFoundException("Chat room not found.");

            var project = await _unitOfWork.Repository<Project>().FindAsync(p => p.TeamId == teamId);

            var allMembers = await _unitOfWork.Repository<TeamMember>()
                .GetQueryable()
                .Include(tm => tm.Student)
                .Where(tm => tm.TeamId == teamId)
                .ToListAsync();

            var memberDtos = allMembers
                    .Where(m => m.Student != null)
                    .Select(member =>
                    {
                        var initials = $"{member.Student!.FirstName[0]}{member.Student.LastName[0]}".ToUpperInvariant();
                        return new ChatMemberDto(member.StudentId, member.Student.FullName, member.Role.ToString(), initials, member.Student.ProfilePictureURL, member.Student.LastOnlineAt);
                    }).ToList();

            var professorUser = await _unitOfWork.Repository<User>().GetByIdAsync(professorId);
            if (professorUser != null)
            {
                var profInitials = $"{professorUser.FirstName[0]}{professorUser.LastName[0]}".ToUpperInvariant();
                memberDtos.Add(new ChatMemberDto(professorId, professorUser.FullName, "Professor", profInitials, professorUser.ProfilePictureURL, professorUser.LastOnlineAt));
            }

            var hiddenMessageIds = await _unitOfWork.Repository<ChatMessageHidden>()
                .GetQueryable()
                .Where(h => h.UserId == professorId)
                .Select(h => h.ChatMessageId)
                .ToListAsync();

            var messages = await _unitOfWork.Repository<ChatMessage>()
                .GetQueryable()
                .Where(m => m.ChatRoomId == chatRoom.Id && !hiddenMessageIds.Contains(m.Id))
                .Include(m => m.Sender)
                .Include(m => m.Attachments)
                .OrderByDescending(m => m.SentAt)
                .Take(50)
                .ToListAsync();

            var messageIds = messages.Select(m => m.Id).ToList();
            var reactions = await _unitOfWork.Repository<ChatMessageReaction>()
                .GetQueryable()
                .Where(r => messageIds.Contains(r.ChatMessageId))
                .ToListAsync();

            messages.Reverse();

            var messageDtos = messages.Select(msg => new ChatMessageDetailDto(
                msg.Id,
                msg.SenderId,
                msg.Sender?.FullName ?? "Unknown",
                msg.Content,
                msg.SentAt,
                msg.IsEdited,
                msg.IsDeletedForAll,
                msg.IsPinned,
                msg.ParentMessageId,
                reactions.Where(r => r.ChatMessageId == msg.Id)
                         .Select(r => new ChatMessageReactionDto(r.UserId, r.Emoji))
                         .ToList(),
                msg.Attachments.FirstOrDefault() != null ? new ChatMessageAttachmentDto(
                    msg.Attachments.First().FileName,
                    msg.Attachments.First().FileName.Contains("_") ? msg.Attachments.First().FileName.Substring(msg.Attachments.First().FileName.IndexOf("_") + 1) : msg.Attachments.First().FileName,
                    msg.Attachments.First().FileType ?? "application/octet-stream",
                    msg.Attachments.First().FileSize
                ) : null
            )).ToList();

            return new TeamChatDto(
                chatRoom.Id,
                project?.Title,
                memberDtos.AsReadOnly(),
                messageDtos.AsReadOnly()
            );
        }

        public async Task<ChatMessageResponseDto> SendProfessorMessageAsync(int professorId, int teamId, string content)
        {
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("Message content cannot be empty.");

            if (content.Length > 2000)
                throw new ArgumentException("Message cannot exceed 2000 characters.");

            var team = await _unitOfWork.Repository<Team>().GetByIdAsync(teamId);
            if (team == null || team.ProfessorId != professorId)
                throw new UnauthorizedAccessException("You are not authorized to send messages to this chat.");

            var chatRoom = await _unitOfWork.Repository<ChatRoom>().FindAsync(c => c.TeamId == teamId);
            if (chatRoom == null) throw new KeyNotFoundException("Chat room not found.");

            var user = await _unitOfWork.Repository<User>().GetByIdAsync(professorId)
                ?? throw new KeyNotFoundException("User not found.");

            var message = new ChatMessage
            {
                ChatRoomId = chatRoom.Id,
                SenderId = professorId,
                Content = content,
                Type = MessageType.Text,
                SentAt = DateTime.UtcNow,
            };

            await _unitOfWork.Repository<ChatMessage>().AddAsync(message);
            await _unitOfWork.CompleteAsync();

            return new ChatMessageResponseDto(message.Id, chatRoom.TeamId, professorId, user.FullName, message.Content, message.SentAt);
        }
    }
}