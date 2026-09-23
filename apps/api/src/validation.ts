import {z} from "zod";
export const modules=["core","organization","finance","credit","commerce","users","templates","menus","frontend"] as const;
export const loginSchema=z.object({email:z.string().trim().email(),password:z.string().min(1).max(200)});
export const userCreateSchema=z.object({email:z.string().trim().email(),fullName:z.string().trim().min(2).max(200),password:z.string().min(8).max(200),role:z.enum(["admin","manager","viewer"]).default("viewer")});
export const formSchema=z.object({name:z.string().trim().min(1).max(200),slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),moduleKey:z.enum(modules),schema:z.record(z.string(),z.unknown())});
export const pageSchema=z.object({name:z.string().trim().min(1).max(200),slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),moduleKey:z.enum(modules),definition:z.record(z.string(),z.unknown())});
export const menuUpdateSchema=z.object({title:z.string().trim().min(1).max(200),path:z.string().trim().min(1).max(500),permission:z.string().trim().max(200).nullable().optional()});
