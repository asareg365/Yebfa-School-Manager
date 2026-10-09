'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export interface TenantContextType {
  tenantId: string | null;
  institutionId: string | null;
  institution: any | null;
  institutionName: string;
  schoolCode: string;
  role: string;
  profile: any | null;
  staffId: string | null;
  studentId: string | null;
  parentId: string | null;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isAccountant: boolean;
  isParent: boolean;
  isStudent: boolean;
  loading: boolean;
  hasActiveTenant: boolean;
  setSuperAdminActiveInstitution: (instId: string | null, instName?: string, code?: string) => void;
  clearTenantState: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();

  const userProfileRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  // Super Admin in-memory active node state
  const [superAdminTenantId, setSuperAdminTenantId] = useState<string | null>(null);
  const [superAdminTenantName, setSuperAdminTenantName] = useState<string | null>(null);
  const [superAdminSchoolCode, setSuperAdminSchoolCode] = useState<string | null>(null);

  const role = profile?.role || 'guest';
  const isSuperAdmin = role === 'super_admin';
  const isOwner = role === 'school_owner';
  const isAdmin = role === 'administrator' || isOwner || isSuperAdmin;
  const isTeacher = role === 'teacher';
  const isAccountant = role === 'accountant';
  const isParent = role === 'parent';
  const isStudent = role === 'student';

  // Synchronize Super Admin state from persisted UI preference if valid
  useEffect(() => {
    if (!profileLoading && isSuperAdmin && typeof window !== 'undefined') {
      const storedId = localStorage.getItem('selected_institution_id');
      const storedName = localStorage.getItem('selected_institution_name');
      const storedCode = localStorage.getItem('selected_school_code');
      if (storedId) {
        setSuperAdminTenantId(storedId);
        setSuperAdminTenantName(storedName || 'Active School Node');
        setSuperAdminSchoolCode(storedCode || '');
      }
    }
  }, [profileLoading, isSuperAdmin]);

  // Authoritative tenant ID resolution
  const authoritativeTenantId = useMemo<string | null>(() => {
    if (authLoading || profileLoading || !user) return null;
    if (isSuperAdmin) {
      return superAdminTenantId;
    }
    // Regular non-super-admin users strictly derive tenant from authenticated Firestore profile
    return profile?.tenantId || profile?.institutionId || null;
  }, [authLoading, profileLoading, user, isSuperAdmin, superAdminTenantId, profile]);

  const instRef = useMemo(
    () => (db && authoritativeTenantId ? doc(db, 'institutions', authoritativeTenantId) : null),
    [db, authoritativeTenantId]
  );
  const { data: institution, loading: instLoading } = useDoc(instRef);

  const authoritativeInstitutionName = useMemo(() => {
    if (isSuperAdmin) {
      return institution?.name || superAdminTenantName || (authoritativeTenantId ? 'Selected Node' : 'No School Selected');
    }
    return institution?.name || profile?.institutionName || 'Registry Hub';
  }, [isSuperAdmin, institution, superAdminTenantName, authoritativeTenantId, profile]);

  const authoritativeSchoolCode = useMemo(() => {
    if (isSuperAdmin) {
      return institution?.schoolCode || superAdminSchoolCode || '';
    }
    return institution?.schoolCode || profile?.schoolCode || '';
  }, [isSuperAdmin, institution, superAdminSchoolCode, profile]);

  const setSuperAdminActiveInstitution = useCallback(
    (instId: string | null, instName?: string, code?: string) => {
      setSuperAdminTenantId(instId);
      setSuperAdminTenantName(instName || null);
      setSuperAdminSchoolCode(code || null);
      if (typeof window !== 'undefined') {
        if (instId) {
          localStorage.setItem('selected_institution_id', instId);
          if (instName) localStorage.setItem('selected_institution_name', instName);
          if (code) localStorage.setItem('selected_school_code', code);
        } else {
          localStorage.removeItem('selected_institution_id');
          localStorage.removeItem('selected_institution_name');
          localStorage.removeItem('selected_school_code');
        }
      }
    },
    []
  );

  const clearTenantState = useCallback(() => {
    setSuperAdminTenantId(null);
    setSuperAdminTenantName(null);
    setSuperAdminSchoolCode(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selected_institution_id');
      localStorage.removeItem('selected_institution_name');
      localStorage.removeItem('selected_school_code');
    }
  }, []);

  const value: TenantContextType = {
    tenantId: authoritativeTenantId,
    institutionId: authoritativeTenantId,
    institution,
    institutionName: authoritativeInstitutionName,
    schoolCode: authoritativeSchoolCode,
    role,
    profile,
    staffId: profile?.staffId || null,
    studentId: profile?.studentId || null,
    parentId: profile?.parentId || null,
    isSuperAdmin,
    isOwner,
    isAdmin,
    isTeacher,
    isAccountant,
    isParent,
    isStudent,
    loading: authLoading || profileLoading || (!!authoritativeTenantId && instLoading),
    hasActiveTenant: !!authoritativeTenantId,
    setSuperAdminActiveInstitution,
    clearTenantState,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
