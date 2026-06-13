export const Roles = {
  Admin: 1,      // 💻 Administrador en MySQL
  Editor: 2,     // 💻 Supervisor en MySQL
  Viewer: 3      // 💻 Operador en MySQL
};

/**
 * Valida si un rol numérico tiene permiso para una acción CRUD básica
 * @param {number} role_id - El ID del perfil del usuario
 * @param {string} action - 'read' | 'create' | 'update' | 'delete'
 */
export function can(role_id, action) {
  const role = parseInt(role_id);

  if (role === Roles.Admin) return true; // El Admin puede todo
  if (role === Roles.Editor) return action !== 'delete'; // El Editor no puede eliminar
  if (role === Roles.Viewer) return action === 'read'; // El Viewer solo lee
  return false;
}