import { z } from "zod";

import {
  EMAIL_RULE,
  EMAIL_RULE_MESSAGE,
  OBJECT_ID_RULE,
  OBJECT_ID_RULE_MESSAGE,
} from "@workspace/shared/utils/validators";

const CARD_SUBITEM_ID = z.string({ error: "Error.IdMustBeString" }).min(1).max(64);

const COMMENT_CONTENT = z
  .string({ error: "Error.CommentContentMustBeString" })
  .trim()
  .min(1, { error: "Error.CommentContentTooShort" })
  .max(2000, { error: "Error.CommentContentTooLong" });

const CARD_COMMENT_SCHEMA = z.object({
  _id: z.string({ error: "Error.CommentIdMustBeString" }).optional(),
  userId: z.string({ error: "Error.UserIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  userEmail: z.email().regex(EMAIL_RULE, { error: EMAIL_RULE_MESSAGE }),
  userAvatar: z.url({ message: "Error.UserAvatarMustBeURL" }).nullable().default(null),
  userDisplayName: z.string({ error: "Error.UserDisplayNameMustBeString" }),
  content: z.string({ error: "Error.CommentContentMustBeString" }),
  commentedAt: z.date({ error: "Error.CommentedAtMustBeDate" }),
  editedAt: z.date({ error: "Error.EditedAtMustBeDate" }).optional(),
});

const CHECKLIST_ITEM_SCHEMA = z.object({
  _id: CARD_SUBITEM_ID,
  text: z
    .string({ error: "Error.ChecklistTextMustBeString" })
    .trim()
    .min(1, { error: "Error.ChecklistTextTooShort" })
    .max(200, { error: "Error.ChecklistTextTooLong" }),
  done: z.boolean({ error: "Error.ChecklistDoneMustBeBoolean" }),
});

export const CARD_COLLECTION_SCHEMA = z.object({
  boardId: z.string({ error: "Error.BoardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  columnId: z.string({ error: "Error.ColumnIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  title: z
    .string({ error: "Error.TitleMustBeString" })
    .min(3, { error: "Error.TitleTooShort" })
    .max(50, { error: "Error.TitleTooLong" })
    .trim(),
  description: z.string({ error: "Error.DescriptionMustBeString" }).optional(),
  cover: z.url({ message: "Error.CoverMustBeURL" }).nullable().default(null),
  memberIds: z
    .array(z.string({ error: "Error.MemberIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }))
    .default([]),
  comments: z.array(CARD_COMMENT_SCHEMA).default([]),
  dueDate: z.date({ error: "Error.DueDateMustBeDate" }).nullable().default(null),
  dueComplete: z.boolean({ error: "Error.DueCompleteMustBeBoolean" }).default(false),
  labelIds: z.array(CARD_SUBITEM_ID).max(50, { error: "Error.TooManyLabels" }).default([]),
  checklist: z.array(CHECKLIST_ITEM_SCHEMA).max(100, { error: "Error.TooManyChecklistItems" }).default([]),
  createdAt: z.date({ error: "Error.CreatedAtMustBeDate" }).default(new Date()),
  updatedAt: z.date({ error: "Error.UpdatedAtMustBeDate" }).nullable().default(null),
  _destroy: z.boolean({ error: "Error._destroyMustBeBoolean" }).default(false),
});

export const CREATE_NEW_CARD_SCHEMA = CARD_COLLECTION_SCHEMA.pick({
  title: true,
  boardId: true,
  columnId: true,
});

const INCOMING_CARD_MEMBER_INFO_SCHEMA = z.object({
  userId: z.string({ error: "Error.UserIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
  action: z.enum(["ADD", "REMOVE"], { error: "Error.ActionMustBeEitherAddOrRemove" }),
});

export const UPDATE_CARD_SCHEMA = CARD_COLLECTION_SCHEMA.pick({ title: true, description: true })
  .extend({
    dueDate: z.iso
      .datetime({ offset: true, error: "Error.DueDateMustBeISODate" })
      .transform((value) => new Date(value))
      .nullable(),
    dueComplete: CARD_COLLECTION_SCHEMA.shape.dueComplete.unwrap(),
    labelIds: CARD_COLLECTION_SCHEMA.shape.labelIds.unwrap(),
    checklist: CARD_COLLECTION_SCHEMA.shape.checklist.unwrap(),
    commentToUpdate: z.object({ _id: CARD_SUBITEM_ID, content: COMMENT_CONTENT }),
    commentToDelete: z.object({ _id: CARD_SUBITEM_ID }),
    commentToAdd: z.object({
      userAvatar: z.url({ message: "Error.UserAvatarMustBeURL" }).nullable().default(null),
      userDisplayName: z.string({ error: "Error.UserDisplayNameMustBeString" }),
      content: COMMENT_CONTENT,
    }),
    incomingMemberInfo: INCOMING_CARD_MEMBER_INFO_SCHEMA,
  })
  .partial();

export const CARD_ID_PARAMS_SCHEMA = z.object({
  id: z.string({ error: "Error.CardIdMustBeString" }).regex(OBJECT_ID_RULE, { error: OBJECT_ID_RULE_MESSAGE }),
});

export type CardPatchType = Partial<z.infer<typeof CARD_COLLECTION_SCHEMA>>;
export type CreateNewCardType = z.infer<typeof CREATE_NEW_CARD_SCHEMA>;
export type UpdateCardType = z.infer<typeof UPDATE_CARD_SCHEMA>;
export type UpdateCardInputType = z.input<typeof UPDATE_CARD_SCHEMA>;
export type CardCommentType = z.infer<typeof CARD_COMMENT_SCHEMA>;
export type ChecklistItemType = z.infer<typeof CHECKLIST_ITEM_SCHEMA>;
export type IncomingCardMemberInfoType = z.infer<typeof INCOMING_CARD_MEMBER_INFO_SCHEMA>;
