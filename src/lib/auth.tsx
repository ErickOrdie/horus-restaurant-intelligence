import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; loading: boolean };
const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setState({ session, loading: false }));
    supabase.auth.getSession().then(({ data: d }) => setState({ session: d.session, loading: false }));
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function useProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [p, r, u] = await Promise.all([
        supabase.from("profiles").select("*, organizations(name, is_demo)").eq("id", uid!).single(),
        supabase.from("user_roles").select("role").eq("user_id", uid!),
        supabase.from("units").select("id, name, city, total_tables").order("name"),
      ]);
      if (p.error) throw p.error;
      const roles = (r.data ?? []).map((x) => x.role);
      return {
        profile: p.data,
        roles,
        canManage: roles.includes("admin") || roles.includes("gestor"),
        units: u.data ?? [],
      };
    },
  });
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  supervisor: "Supervisor",
  operador: "Operador",
  analista: "Analista",
};
