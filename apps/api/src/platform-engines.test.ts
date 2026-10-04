import test from "node:test";
import assert from "node:assert/strict";
import {matches} from "./platform-engines.js";

test("rule matcher evaluates comparison operators",()=>{
 assert.equal(matches({amount:120},{equals:{}}),true);
 assert.equal(matches(120,{gte:100,lte:200}),true);
 assert.equal(matches(50,{gt:100}),false);
 assert.equal(matches("paid",{in:["paid","confirmed"]}),true);
});
