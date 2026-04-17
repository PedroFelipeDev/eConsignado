/**
 * eSocial Backend Server — Express.js
 * 
 * Servidor local para comunicação SOAP com os WebServices do eSocial.
 * Utiliza mTLS com Certificado Digital A1 (.pfx) para autenticação.
 * 
 * LIMITAÇÕES DO GOVERNO (CRÍTICO):
 * - Máximo de 10 requisições/dia por empregador (Consulta + Download somados)
 * - Sem paralelismo: apenas 1 consulta por vez por empregador
 * - Bloqueio entre dias 1 e 7 de cada mês
 * - Data fim da consulta deve ser >= 1h antes da hora atual
 * - Máximo de 50 eventos por requisição de download
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Supabase client (service role for server-side operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Routes

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'eSocial Backend',
    timestamp: new Date().toISOString() 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
