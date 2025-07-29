ALTER TABLE "fragments" RENAME COLUMN "message_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "fragments" DROP CONSTRAINT "fragments_message_id_unique";--> statement-breakpoint
ALTER TABLE "fragments" DROP CONSTRAINT "fragments_message_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "fragments" ADD CONSTRAINT "fragments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;