import supabase from '../../config/supabase';
import type { CreateMemberRoleDto } from './dto/create-member-role.dto';

export interface MemberRole {
  id: string;
  name: string;
  created_at: string;
}

export async function findAllMemberRoles(): Promise<MemberRole[]> {
  const { data, error } = await supabase
    .from('member_roles')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as MemberRole[];
}

export async function createMemberRole(dto: CreateMemberRoleDto): Promise<MemberRole> {
  const { data, error } = await supabase
    .from('member_roles')
    .insert({ name: dto.name.trim() })
    .select('id, name, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw Object.assign(new Error(`Role "${dto.name}" already exists`), { statusCode: 409 });
    }
    throw new Error(error.message);
  }

  return data as MemberRole;
}

export async function deleteMemberRole(id: string): Promise<void> {
  const { error } = await supabase.from('member_roles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
