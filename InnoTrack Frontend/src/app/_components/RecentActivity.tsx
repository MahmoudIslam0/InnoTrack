import {
  FileSearch,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Activity {
  id: string;
  type: "check" | "feedback" | "approval" | "alert";
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "check",
    title: "Similarity Check Completed",
    description: "Your project scored 85% originality",
    time: "2 hours ago",
  },
  {
    id: "2",
    type: "feedback",
    title: "Professor Response",
    description: "Dr. Ahmed reviewed your proposal",
    time: "1 day ago",
  },
  {
    id: "3",
    type: "approval",
    title: "Draft Saved",
    description: "Your project draft was saved successfully",
    time: "3 days ago",
  },
  {
    id: "4",
    type: "alert",
    title: "New Message",
    description: "You have a new message in team chat",
    time: "1 week ago",
  },
];

const iconMap = {
  check: { icon: FileSearch, bgColor: "bg-blue-50", color: "text-blue-600" },
  feedback: {
    icon: MessageSquare,
    bgColor: "bg-green-50",
    color: "text-green-600",
  },
  approval: {
    icon: CheckCircle,
    bgColor: "bg-emerald-50",
    color: "text-emerald-600",
  },
  alert: {
    icon: AlertCircle,
    bgColor: "bg-yellow-50",
    color: "text-yellow-600",
  },
};

export function RecentActivity() {
  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Recent Activity
      </h3>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {activities.map((activity) => {
          const { icon: Icon, bgColor, color } = iconMap[activity.type];

          return (
            <div
              key={activity.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-lg ${bgColor} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
