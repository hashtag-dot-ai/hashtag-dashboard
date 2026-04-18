// Generated from OpenAPI spec at http://localhost:8000/openapi.json

export type PlanType = 'free' | 'business' | 'enterprise';
export type KeyType = 'read_only' | 'read_write' | 'manage';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface MeResponse {
  user_id: number;
  auth0_sub: string;
  email?: string | null;
  plan: PlanType;
  credits_remaining: number;
}

export interface ProjectOut {
  tenant_id: string;
  name: string;
  default_schema?: string | null;
  default_prompt?: string | null;
  is_owner: boolean;
}

export interface ProjectCreate {
  name: string;
  tenant_id: string;
}

export interface ProjectUpdate {
  name?: string | null;
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

export interface TeamOut {
  slug: string;
  name: string;
}

export interface TeamCreate {
  slug: string;
  name: string;
}

export interface TeamUpdate {
  name: string;
}

export interface MemberOut {
  team_slug: string;
  user_id: number;
  role: MemberRole;
}

export interface MemberAdd {
  user_id: number;
  role?: MemberRole;
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
