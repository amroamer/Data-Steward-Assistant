import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface Entity {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  logoBase64: string | null;
  appTitle: string | null;
  colorSidebar: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  colorAccent: string | null;
  logoInvert: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface EntityContextValue {
  entities: Entity[];
  currentEntity: Entity | null;
  setCurrentEntity: (entity: Entity) => void;
  loading: boolean;
  refetchEntities: () => Promise<void>;
}

const EntityContext = createContext<EntityContextValue>({
  entities: [],
  currentEntity: null,
  setCurrentEntity: () => {},
  loading: true,
  refetchEntities: async () => {},
});

const STORAGE_KEY = "zatca-current-entity-id";

export function EntityProvider({ children }: { children: ReactNode }) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [currentEntity, setCurrentEntityState] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEntities = async () => {
    try {
      const res = await fetch("/api/entities");
      if (res.ok) {
        const list: Entity[] = await res.json();
        setEntities(list);

        // Restore previously selected entity or pick the first active one
        const savedId = localStorage.getItem(STORAGE_KEY);
        const saved = savedId ? list.find((e) => e.id === parseInt(savedId)) : null;
        const active = list.filter((e) => e.isActive);
        const selected = saved || active[0] || list[0] || null;
        setCurrentEntityState(selected);
      }
    } catch (err) {
      console.error("Failed to fetch entities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const setCurrentEntity = (entity: Entity) => {
    setCurrentEntityState(entity);
    localStorage.setItem(STORAGE_KEY, String(entity.id));
  };

  return (
    <EntityContext.Provider
      value={{
        entities,
        currentEntity,
        setCurrentEntity,
        loading,
        refetchEntities: fetchEntities,
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
