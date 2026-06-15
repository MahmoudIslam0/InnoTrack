namespace InnoTrack.Application.Interfaces
{
    public interface IJoinCodeGenerator
    {
        string GenerateJoinCode(int length = 6);
    }
}
