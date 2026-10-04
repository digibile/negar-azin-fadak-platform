export type PaymentProviderStatus="pending"|"authorized"|"paid"|"failed"|"refunded";

export interface PaymentRequest {
 tenantId:string;
 orderId:string;
 amount:number;
 currency:string;
 paymentNo:string;
 providerRef?:string|null;
 metadata?:Record<string,unknown>;
}

export interface PaymentResult {
 status:PaymentProviderStatus;
 providerCode:string;
 providerTransactionId:string;
 providerPayload:Record<string,unknown>;
}

export interface PaymentProvider {
 readonly code:string;
 createPayment(input:PaymentRequest):Promise<PaymentResult>;
 verifyPayment(input:{providerTransactionId:string;amount:number;metadata?:Record<string,unknown>}):Promise<PaymentResult>;
 refundPayment(input:{providerTransactionId:string;amount:number;metadata?:Record<string,unknown>}):Promise<PaymentResult>;
}

class ManualPaymentProvider implements PaymentProvider {
 readonly code="manual";
 async createPayment(input:PaymentRequest):Promise<PaymentResult>{
  if(!input.providerRef) throw new Error("برای پرداخت دستی، شناسه مرجع پرداخت الزامی است");
  return {status:"paid",providerCode:this.code,providerTransactionId:input.providerRef,providerPayload:{mode:"manual",reference:input.providerRef}};
 }
 async verifyPayment(input:{providerTransactionId:string;amount:number}):Promise<PaymentResult>{
  if(!input.providerTransactionId) throw new Error("شناسه تراکنش الزامی است");
  return {status:"paid",providerCode:this.code,providerTransactionId:input.providerTransactionId,providerPayload:{mode:"manual",verified:true,amount:input.amount}};
 }
 async refundPayment(input:{providerTransactionId:string;amount:number}):Promise<PaymentResult>{
  if(!input.providerTransactionId) throw new Error("شناسه تراکنش برای بازگشت وجه الزامی است");
  return {status:"refunded",providerCode:this.code,providerTransactionId:input.providerTransactionId,providerPayload:{mode:"manual",refunded:true,amount:input.amount}};
 }
}

const providers:Record<string,PaymentProvider>={manual:new ManualPaymentProvider()};

export function getPaymentProvider(code=process.env.PAYMENT_PROVIDER||"manual"):PaymentProvider{
 const provider=providers[code];
 if(!provider) throw new Error("درگاه پرداخت پیکربندی نشده است: "+code);
 return provider;
}

export function registerPaymentProvider(provider:PaymentProvider):void{
 if(!/^[a-z0-9_-]+$/.test(provider.code)) throw new Error("کد درگاه پرداخت نامعتبر است");
 providers[provider.code]=provider;
}