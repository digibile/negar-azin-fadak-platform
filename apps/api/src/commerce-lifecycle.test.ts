import assert from "node:assert/strict";
import test from "node:test";
import {isAllowedLifecycleTransition,purchaseOrderTransitions,salesOrderTransitions} from "./commerce-lifecycle.js";

test("sales order lifecycle allows only declared forward transitions",()=>{
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"draft","pending_credit"),true);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"pending_credit","confirmed"),true);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"confirmed","reserved"),true);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"reserved","delivering"),true);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"delivering","delivered"),true);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"draft","delivered"),false);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"delivered","reserved"),false);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"cancelled","confirmed"),false);
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"returned","invoiced"),false);
});

test("purchase order status endpoint cannot bypass receipt, invoice or payment operations",()=>{
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"draft","approved"),true);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"approved","sent"),true);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"sent","partially_received"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"partially_received","received"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"received","invoiced"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"invoiced","paid"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"draft","paid"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"sent","paid"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"partially_received","cancelled"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"paid","cancelled"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"cancelled","approved"),false);
});

test("unknown states and empty destinations are rejected",()=>{
 assert.equal(isAllowedLifecycleTransition(salesOrderTransitions,"unknown","confirmed"),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"unknown",""),false);
 assert.equal(isAllowedLifecycleTransition(purchaseOrderTransitions,"paid",""),false);
});
