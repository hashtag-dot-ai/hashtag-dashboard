// API types for KG Shim v5

export type MemberRole = 'owner' | 'member';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface MeResponse {
  user_id: number;
  auth0_sub: string;
  email?: string | null;
  username?: string | null;
  account_key_prefix?: string | null;
  /** Full account key — returned on first login and after rotation. Keep private. */
  account_key?: string | null;
  /** Alias for first-login display. Same value as account_key when present. */
  raw_account_key?: string | null;
  credits_remaining: number;
}

export interface ProfileUpdate {
  username: string;
}

export interface AccountKeyRotated {
  raw_key: string;
  key_prefix: string;
}

export interface UsernameSuggestion {
  suggestion: string;
}

// ---------------------------------------------------------------------------
// Corpuses
// ---------------------------------------------------------------------------

export interface CorpusOut {
  corpus_id: string;       // UUID perma-ID
  compound_name: string;   // e.g. "alice:research"
  name: string;            // slug part only
  owner: string;           // username or team slug
  is_personal: boolean;
  is_owner: boolean;
  team_slug?: string | null;
}

export interface CorpusCreate {
  name: string;
  owner?: string | null;   // defaults to current user's username
}

export interface CorpusUpdate {
  name?: string | null;
}

export interface AvailabilityCheck {
  available: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Corpus keys
// ---------------------------------------------------------------------------

export interface KeyOut {
  key_prefix: string;
  description?: string | null;
  revoked: boolean;
}

export interface KeyCreate {
  description?: string | null;
}

export interface KeyCreated extends KeyOut {
  raw_key: string;
}

// ---------------------------------------------------------------------------
// Corpus invites / members
// ---------------------------------------------------------------------------

export interface InviteOut {
  token_prefix: string;
  created_at: string;
}

export interface InviteCreated extends InviteOut {
  raw_token: string;
}

export interface InvitePreview {
  corpus_id: string;
  compound_name: string;
}

export interface InviteAccept {
  token: string;
}

export interface InviteAcceptResult {
  corpus_id: string;
  compound_name: string;
  already_member: boolean;
}

export interface CorpusMemberOut {
  user_id: number;
  username?: string | null;
  role: string;
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export interface TeamOut {
  slug: string;
  name: string;
  is_owner: boolean;
  role: string;
  credits_remaining: number;
  use_team_credits: boolean;
}

export interface TeamCreate {
  slug: string;
  name: string;
}

export interface TeamUpdate {
  name?: string | null;
  use_team_credits?: boolean | null;
}

export interface MemberOut {
  team_slug: string;
  user_id: number;
  username?: string | null;
  role: string;
}

export interface TeamInviteOut {
  token_prefix: string;
  created_at: string;
}

export interface TeamInviteCreated extends TeamInviteOut {
  raw_token: string;
}

export interface TeamInvitePreview {
  slug: string;
  team_name: string;
}

export interface TeamInviteAccept {
  token: string;
}

export interface TeamInviteAcceptResult {
  slug: string;
  team_name: string;
  already_member: boolean;
}

export interface TeamKeyOut {
  key_prefix: string;
  description?: string | null;
  revoked: boolean;
}

export interface TeamKeyCreated extends TeamKeyOut {
  raw_key: string;
}

// ---------------------------------------------------------------------------
// Knowledge graph types (returned by GET /{tenant_id}/graph)
// ---------------------------------------------------------------------------

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
