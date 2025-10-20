'use client';

import { useState } from 'react';
import { Button } from '@finapp/ui';
import { Trash2, Shield, Eye, User, Crown } from 'lucide-react';

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
  profiles: {
    email: string;
    display_name?: string;
  };
}

interface HouseholdMembersProps {
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
  householdId: string;
}

const roleIcons = {
  owner: <Crown className="h-4 w-4 text-yellow-500" />,
  admin: <Shield className="h-4 w-4 text-blue-500" />,
  member: <User className="h-4 w-4 text-green-500" />,
  viewer: <Eye className="h-4 w-4 text-gray-500" />,
};

const roleLabels = {
  owner: 'Vlastník',
  admin: 'Administrátor',
  member: 'Člen',
  viewer: 'Pozorovateľ',
};

const roleDescriptions = {
  owner: 'Plný prístup, môže mazať domácnosť',
  admin: 'Môže spravovať členov a všetky dáta',
  member: 'Môže pridávať a upravovať dáta',
  viewer: 'Len čítanie, nemôže upravovať',
};

export function HouseholdMembers({ members, currentUserId, isOwner }: HouseholdMembersProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setIsUpdating(memberId);
    try {
      const response = await fetch(`/api/household/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');
      
      window.location.reload();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Nepodarilo sa zmeniť rolu');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Naozaj chcete odstrániť tohto člena?')) return;

    setIsUpdating(memberId);
    try {
      const response = await fetch(`/api/household/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove member');
      
      window.location.reload();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Nepodarilo sa odstrániť člena');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      {members.map((member) => {
        const isCurrentUser = member.user_id === currentUserId;
        const canModify = isOwner && !isCurrentUser && member.role !== 'owner';

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                {roleIcons[member.role]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {member.profiles.display_name || member.profiles.email}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      Vy
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {member.profiles.email}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium">{roleLabels[member.role]}</span>
                  <span className="text-xs text-muted-foreground">
                    • {roleDescriptions[member.role]}
                  </span>
                </div>
              </div>
            </div>

            {canModify && (
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  disabled={isUpdating === member.id}
                  className="text-sm border rounded-md px-2 py-1 bg-background"
                >
                  <option value="admin">Administrátor</option>
                  <option value="member">Člen</option>
                  <option value="viewer">Pozorovateľ</option>
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isUpdating === member.id}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

