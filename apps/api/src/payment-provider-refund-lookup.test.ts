import assert from "node:assert/strict";
import test from "node:test";
import {
 lookupPaymentRefundStatus,
 type PaymentProvider,
 type PaymentRequest,
 type PaymentResult,
 type RefundStatusLookupRequest
} from "./payment-provider.js";

const request:RefundStatusLookupRequest={
 providerTransactionId:"provider-tx-100",
 amount:125000,
 metadata:{refundId:"refund-100",idempotencyKey:"refund-key-100"}
};

function provider(overrides:Partial<PaymentProvider>={}):PaymentProvider{
 return {
  code:"contract-test",
  async createPayment(_input:PaymentRequest):Promise<PaymentResult>{
   return {status:"pending",providerCode:"contract-test",providerTransactionId:"create-tx",providerPayload:{}};
  },
  async verifyPayment():Promise<PaymentResult>{
   return {status:"paid",providerCode:"contract-test",providerTransactionId:"verify-tx",providerPayload:{}};
  },
  async refundPayment():Promise<PaymentResult>{
   return {status:"refunded",providerCode:"contract-test",providerTransactionId:"refund-tx",providerPayload:{}};
  },
  ...overrides
 };
}

test("provider without a documented refund lookup is explicitly unsupported",async()=>{
 const result=await lookupPaymentRefundStatus(provider(),request);
 assert.deepEqual(result,{supported:false,providerCode:"contract-test"});
});

test("authoritative provider lookup returns its confirmed pending state without treating it as failure",async()=>{
 let received:RefundStatusLookupRequest|undefined;
 const result=await lookupPaymentRefundStatus(provider({
  async lookupRefundStatus(input){
   received=input;
   return {status:"pending",providerCode:"contract-test",providerTransactionId:input.providerTransactionId,providerPayload:{state:"processing"}};
  }
 }),request);
 assert.equal(result.supported,true);
 if(result.supported)assert.equal(result.result.status,"pending");
 assert.equal(received,request);
});

test("provider lookup can report refunded only with the matching provider and transaction",async()=>{
 const result=await lookupPaymentRefundStatus(provider({
  async lookupRefundStatus(input){
   return {status:"refunded",providerCode:"contract-test",providerTransactionId:input.providerTransactionId,providerPayload:{state:"settled"}};
  }
 }),request);
 assert.equal(result.supported,true);
 if(result.supported)assert.equal(result.result.status,"refunded");
});

test("provider lookup rejects a response for another transaction",async()=>{
 await assert.rejects(
  lookupPaymentRefundStatus(provider({
   async lookupRefundStatus(){
    return {status:"refunded",providerCode:"contract-test",providerTransactionId:"different-tx",providerPayload:{}};
   }
  }),request),
  /مطابقت ندارد/
 );
});

test("provider lookup transport failures propagate and are never converted to failed refunds",async()=>{
 await assert.rejects(
  lookupPaymentRefundStatus(provider({
   async lookupRefundStatus(){throw new Error("provider timeout");}
  }),request),
  /provider timeout/
 );
});

test("provider lookup rejects a response attributed to another provider",async()=>{
 await assert.rejects(
  lookupPaymentRefundStatus(provider({
   async lookupRefundStatus(input){
    return {status:"refunded",providerCode:"other-provider",providerTransactionId:input.providerTransactionId,providerPayload:{}};
   }
  }),request),
  /مطابقت ندارد/
 );
});
