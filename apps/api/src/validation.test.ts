import test from "node:test";
import assert from "node:assert/strict";
import {loginSchema,userCreateSchema,formSchema,pageSchema,menuUpdateSchema} from "./validation.js";

test("login schema accepts valid credentials",()=>{const value=loginSchema.parse({email:"Admin@Example.com",password:"secret"});assert.equal(value.email,"Admin@Example.com");});
test("login schema rejects invalid email",()=>{assert.throws(()=>loginSchema.parse({email:"bad",password:"secret"}));});
test("user schema applies viewer default",()=>{const value=userCreateSchema.parse({email:"a@example.com",fullName:"کاربر تست",password:"12345678"});assert.equal(value.role,"viewer");});
test("form schema requires a safe slug",()=>{assert.throws(()=>formSchema.parse({name:"X",slug:"Bad Slug",schema:{fields:[]}}));});
test("page schema accepts a block definition",()=>{const value=pageSchema.parse({name:"صفحه",slug:"home",moduleKey:"frontend",definition:{blocks:[]}});assert.deepEqual(value.definition,{blocks:[]});});
test("menu schema permits nullable permission",()=>{const value=menuUpdateSchema.parse({title:"منو",path:"/admin",permission:null});assert.equal(value.permission,null);});
