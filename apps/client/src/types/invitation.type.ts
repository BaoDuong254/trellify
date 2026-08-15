import type { BoardCollectionType } from "@workspace/shared/schemas/board.schema";
import type { UserInvitedToBoardPayloadType } from "@workspace/shared/schemas/socket.schema";

export type Notifications = UserInvitedToBoardPayloadType<BoardCollectionType>;
