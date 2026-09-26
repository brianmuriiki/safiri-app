/// <reference types="vite/client" />

declare module "@paystack/inline-js" {
  interface PaystackCallbacks {
    onSuccess?: (response: { reference: string; message: string }) => void | Promise<void>
    onCancel?: () => void
    onError?: (error: { message: string }) => void
  }

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): unknown
  }
}
