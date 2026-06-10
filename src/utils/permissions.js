
export const Roles = {
  Admin: 'admin',
  Editor: 'editor',
  Viewer: 'viewer'
};

// Puedes afinar permisos por modelo y verbo si lo necesitas.
export function can(role, action /* 'read' | 'create' | 'update' | 'delete' */) {
  if (role === Roles.Admin) return true;
  if (role === Roles.Editor) return action !== 'delete';
  if (role === Roles.Viewer) return action === 'read';
  return false;
}
