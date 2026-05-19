// Generated from OpenAPI spec at http://localhost:8000/openapi.json

export type PlanType = 'free' | 'business' | 'enterprise';
export type KeyType = 'read_only' | 'read_write' | 'manage';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface MeResponse {
  user_id?: number | null;
  /** Public username slug used in compound corpus names, e.g. 'alice' in 'alice:my-project' */
  user_name?: string | null;
  /** Canonical user identifier — shared across Auth0 accounts with the same email */
  email?: string | null;
  plan?: PlanType | null;
  credits_remaining?: number | null;
  /** Fresh management key (hashtag-user-key-…) — rotate on every login, use as Bearer token for /mgmt calls.
   *  Null when email could not be determined; check `warning` for a user-facing message. */
  management_key?: string | null;
  /** Present when login partially succeeded but a management key could not be issued. Show to the user. */
  warning?: string | null;
  userinfo?: Record<string, unknown> | null;
}

export interface ProjectOut {
  tenant_id: string;
  /** Permanent UUID identifier ('proj-…') — use as 'id:{proj_perma_id}' in API calls */
  proj_perma_id?: string | null;
  /** Compound name 'owner_username:tenant_id' — preferred identifier for API calls */
  compound_name?: string | null;
  /** Human-readable display name (may contain spaces — not used in API calls) */
  proj_display_name: string;
  default_schema?: string | null;
  default_prompt?: string | null;
  is_owner: boolean;
}

export interface ProjectCreate {
  /** Human-readable display name (may contain spaces) */
  proj_display_name: string;
  tenant_id: string;
}

export interface ProjectUpdate {
  /** Human-readable display name (may contain spaces) */
  proj_display_name?: string | null;
  default_schema?: string | null;
  default_prompt?: string | null;
}

export interface KeyOut {
  key_prefix: string;
  key_type: KeyType;
  description?: string | null;
  rate_limit?: number | null;
  revoked: boolean;
}

export interface KeyCreate {
  key_type?: KeyType;
  description?: string | null;
  rate_limit?: number | null;
}

export interface KeyCreated extends KeyOut {
  /** Shown ONCE at creation — never retrievable again */
  raw_key: string;
}

export interface BillingOut {
  plan: PlanType;
  credits_remaining: number;
  /** -1 = unlimited (enterprise) */
  credits_limit: number;
  operation_costs: Record<string, number>;
}

export interface PlanUpdate {
  plan: PlanType;
}

export interface AvailabilityCheck {
  available: boolean;
  reason?: string;
}

export interface ProjectMemberOut {
  user_id: number;
  email?: string | null;
  role: 'owner' | 'member';
  joined_at?: string | null;
}

export interface InviteOut {
  key_prefix: string;
  created_at: string;
}

export interface InviteCreated extends InviteOut {
  raw_token: string;
}

export interface InviteAccept {
  token: string;
}

export interface InviteAcceptResult {
  tenant_id: string;
  project_name: string;
  already_member: boolean;
}

// Knowledge graph types (returned by GET /{tenant_id}/graph)
export type GraphInclude = 'entities' | 'entities_docs' | 'full';

export interface GraphNode {
  element_id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  element_id: string;
  type: string;
  start_node_element_id: string;
  end_node_element_id: string;
  properties: Record<string, unknown>;
}

export interface GraphResponse {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}
