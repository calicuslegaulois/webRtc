const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

/**
 * Gestionnaire de base de données MySQL simple et efficace
 * Remplace Prisma avec une approche plus directe
 */
class DatabaseManager {
  constructor() {
    this.connection = null;
    this.config = this.getDatabaseConfig();
  }

  /**
   * Obtenir la configuration de la base de données
   */
  getDatabaseConfig() {
    console.log('🏠 Configuration base de données');
    return {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'webrtc_visioconf',
      ssl: false
    };
  }

  /**
   * Obtenir une connexion à la base de données
   */
  async getConnection() {
    if (!this.connection) {
      this.connection = await mysql.createConnection(this.config);
      console.log('🔌 Connexion à MySQL établie');
    }
    return this.connection;
  }

  /**
   * Exécuter une requête SQL
   */
  async query(sql, params = []) {
    const connection = await this.getConnection();
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('❌ Erreur SQL:', error.message);
      console.error('SQL:', sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Exécuter une requête et retourner le premier résultat
   */
  async queryOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  /**
   * Insérer un enregistrement et retourner l'ID
   */
  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;
    const result = await this.query(sql, values);
    return result.insertId;
  }

  /**
   * Mettre à jour un enregistrement
   */
  async update(table, data, where, whereParams = []) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
    
    const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${where}`;
    const result = await this.query(sql, [...values, ...whereParams]);
    return result.affectedRows;
  }

  /**
   * Supprimer un enregistrement
   */
  async delete(table, where, params = []) {
    const sql = `DELETE FROM \`${table}\` WHERE ${where}`;
    const result = await this.query(sql, params);
    return result.affectedRows;
  }

  /**
   * Trouver un enregistrement par ID
   */
  async findById(table, id) {
    return await this.queryOne(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  }

  /**
   * Trouver tous les enregistrements avec conditions optionnelles
   */
  async find(table, where = '1=1', params = [], orderBy = '') {
    let sql = `SELECT * FROM \`${table}\` WHERE ${where}`;
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    return await this.query(sql, params);
  }

  /**
   * Compter les enregistrements
   */
  async count(table, where = '1=1', params = []) {
    const result = await this.queryOne(`SELECT COUNT(*) as count FROM \`${table}\` WHERE ${where}`, params);
    return result.count;
  }

  /**
   * Fermer la connexion
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('🔌 Connexion MySQL fermée');
    }
  }

  /**
   * Générer un UUID
   */
  generateId() {
    return uuidv4();
  }

  /**
   * Échapper une chaîne pour SQL
   */
  escape(value) {
    if (this.connection) {
      return this.connection.escape(value);
    }
    return `'${String(value).replace(/'/g, "''")}'`;
  }
}

// Instance singleton
const db = new DatabaseManager();

module.exports = db;
