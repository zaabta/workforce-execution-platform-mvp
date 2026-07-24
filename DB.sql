CREATE TABLE "users" (
  "id" uuid PRIMARY KEY,
  "full_name" varchar,
  "email" varchar UNIQUE,
  "password_hash" varchar,
  "is_active" boolean,
  "created_at" timestamp
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY,
  "name" varchar UNIQUE
);

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY,
  "name" varchar UNIQUE
);

CREATE TABLE "user_roles" (
  "user_id" uuid,
  "role_id" uuid,
  "project_id" uuid,
  PRIMARY KEY ("user_id", "role_id", "project_id")
);

CREATE TABLE "role_permissions" (
  "role_id" uuid,
  "permission_id" uuid,
  PRIMARY KEY ("role_id", "permission_id")
);

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY,
  "name" varchar,
  "code" varchar
);

CREATE TABLE "regions" (
  "id" uuid PRIMARY KEY,
  "project_id" uuid,
  "name" varchar
);

CREATE TABLE "locations" (
  "id" uuid PRIMARY KEY,
  "region_id" uuid,
  "code" varchar,
  "name" varchar
);

CREATE TABLE "user_scopes" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "project_id" uuid,
  "region_id" uuid,
  "location_id" uuid
);

CREATE TABLE "tow" (
  "id" uuid PRIMARY KEY,
  "code" varchar,
  "name" varchar
);

CREATE TABLE "stow" (
  "id" uuid PRIMARY KEY,
  "tow_id" uuid,
  "code" varchar,
  "name" varchar
);

CREATE TABLE "sstow" (
  "id" uuid PRIMARY KEY,
  "stow_id" uuid,
  "code" varchar,
  "name" varchar
);

CREATE TABLE "daily_plans" (
  "id" uuid PRIMARY KEY,
  "project_id" uuid,
  "region_id" uuid,
  "location_id" uuid,
  "tow_id" uuid,
  "stow_id" uuid,
  "sstow_id" uuid,
  "technical_office_id" uuid,
  "assigned_head_master_id" uuid,
  "planned_quantity" decimal,
  "planned_man_day" decimal,
  "actual_quantity" decimal,
  "actual_man_day" decimal,
  "overtime" decimal,
  "work_date" date,
  "status" varchar,
  "comment" text,
  "created_at" timestamp
);

CREATE TABLE "crews" (
  "id" uuid PRIMARY KEY,
  "daily_plan_id" uuid,
  "name" varchar,
  "worker_type" varchar
);

CREATE TABLE "workers" (
  "id" uuid PRIMARY KEY,
  "employee_no" varchar,
  "full_name" varchar
);

CREATE TABLE "crew_members" (
  "crew_id" uuid,
  "worker_id" uuid,
  PRIMARY KEY ("crew_id", "worker_id")
);

CREATE TABLE "workflow_history" (
  "id" uuid PRIMARY KEY,
  "daily_plan_id" uuid,
  "from_status" varchar,
  "to_status" varchar,
  "action" varchar,
  "performed_by" uuid,
  "comment" text,
  "created_at" timestamp
);

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid,
  "title" varchar,
  "body" text,
  "is_read" boolean,
  "created_at" timestamp
);

ALTER TABLE "user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_roles" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_roles" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "role_permissions" ADD FOREIGN KEY ("role_id") REFERENCES "roles" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "role_permissions" ADD FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "regions" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "locations" ADD FOREIGN KEY ("region_id") REFERENCES "regions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scopes" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scopes" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scopes" ADD FOREIGN KEY ("region_id") REFERENCES "regions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "user_scopes" ADD FOREIGN KEY ("location_id") REFERENCES "locations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "stow" ADD FOREIGN KEY ("tow_id") REFERENCES "tow" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sstow" ADD FOREIGN KEY ("stow_id") REFERENCES "stow" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("project_id") REFERENCES "projects" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("region_id") REFERENCES "regions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("location_id") REFERENCES "locations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("tow_id") REFERENCES "tow" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("stow_id") REFERENCES "stow" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("sstow_id") REFERENCES "sstow" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("technical_office_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "daily_plans" ADD FOREIGN KEY ("assigned_head_master_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "crews" ADD FOREIGN KEY ("daily_plan_id") REFERENCES "daily_plans" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "crew_members" ADD FOREIGN KEY ("crew_id") REFERENCES "crews" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "crew_members" ADD FOREIGN KEY ("worker_id") REFERENCES "workers" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "workflow_history" ADD FOREIGN KEY ("daily_plan_id") REFERENCES "daily_plans" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "workflow_history" ADD FOREIGN KEY ("performed_by") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "notifications" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;
