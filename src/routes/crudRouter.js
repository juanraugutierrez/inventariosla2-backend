
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { can } from '../utils/permissions.js';
import express from 'express';

function delegateFor(prisma, modelName) {
  const key = modelName.slice(0,1).toLowerCase() + modelName.slice(1);
  const d = prisma[key];
  if (!d || typeof d.findMany !== 'function') {
    throw new Error(`Modelo Prisma no encontrado: ${modelName} (delegate ${key})`);
  }
  return d;
}

// Ajusta si tus PK no son 'id'
function pkFieldFor(/* modelName */) { return 'id'; }

function parseJSON(q) { try { return q ? JSON.parse(q) : undefined; } catch { return undefined; } }

export default function crudRouter(prisma) {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/:model', requireRole(role => can(role, 'read')), async (req, res) => {
    try {
      const { model } = req.params;
      const d = delegateFor(prisma, model);
      const where = parseJSON(req.query.where);
      const include = parseJSON(req.query.include);
      const select = parseJSON(req.query.select);
      const orderBy = parseJSON(req.query.orderBy);
      const skip = req.query.skip ? parseInt(req.query.skip) : undefined;
      const take = req.query.take ? parseInt(req.query.take) : 100;
      const data = await d.findMany({ where, include, select, orderBy, skip, take });
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  router.get('/:model/:id', requireRole(role => can(role, 'read')), async (req, res) => {
    try {
      const { model, id } = req.params;
      const d = delegateFor(prisma, model);
      const where = { [pkFieldFor(model)]: isNaN(+id) ? id : +id };
      const data = await d.findUnique({ where });
      if (!data) return res.status(404).json({ error: 'No encontrado' });
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  router.post('/:model', requireRole(role => can(role, 'create')), async (req, res) => {
    try {
      const { model } = req.params;
      const d = delegateFor(prisma, model);
      const body = req.body?.data || req.body;
      const created = await d.create({ data: body });
      res.status(201).json(created);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/:model/:id', requireRole(role => can(role, 'update')), async (req, res) => {
    try {
      const { model, id } = req.params;
      const d = delegateFor(prisma, model);
      const body = req.body?.data || req.body;
      const where = { [pkFieldFor(model)]: isNaN(+id) ? id : +id };
      const updated = await d.update({ where, data: body });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  router.delete('/:model/:id', requireRole(role => can(role, 'delete')), async (req, res) => {
    try {
      const { model, id } = req.params;
      const d = delegateFor(prisma, model);
      const where = { [pkFieldFor(model)]: isNaN(+id) ? id : +id };
      const deleted = await d.delete({ where });
      res.json(deleted);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}
