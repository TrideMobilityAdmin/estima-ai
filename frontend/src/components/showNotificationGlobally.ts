import { showNotification } from "@mantine/notifications";

export type NotificationType = "success" | "error" | "warning";

export const showAppNotification = (type: NotificationType, title: string, message: string) => {
  const colorMap = {
    success: "green",
    error: "red",
    warning: "orange",
  };

  showNotification({
    title,
    message,
    color: colorMap[type],
    style: { position: "fixed", bottom: 20, right: 20, zIndex: 1000 },
  });
};
