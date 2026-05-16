import toastLib from "react-hot-toast"

export const toast = {
  success: (message: string) => toastLib.success(message),
  error: (message: string) => toastLib.error(message),
  loading: (message: string) => toastLib.loading(message),
  dismiss: toastLib.dismiss,
}
