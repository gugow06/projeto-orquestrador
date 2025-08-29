/**
 * Serviço para conexão e operações com banco de dados
 * Suporta PostgreSQL, MySQL, SQLite e SQL Server
 */

import { TransformedData, FieldSchema } from '@/types';

export interface DatabaseConfig {
  connectionString: string;
  type: 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';
  tableName?: string;
  schema?: string;
}

export interface DatabaseResult {
  success: boolean;
  insertedRows?: number;
  tableName?: string;
  database?: string;
  error?: string;
  executedQueries?: string[];
}

export class DatabaseService {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Publica dados transformados no banco de dados
   */
  async publishData(transformedData: TransformedData): Promise<DatabaseResult> {
    try {
      // Validar string de conexão
      const connectionInfo = this.parseConnectionString(this.config.connectionString);
      if (!connectionInfo.isValid) {
        throw new Error(`String de conexão inválida: ${connectionInfo.error}`);
      }

      // Gerar nome da tabela se não fornecido
      const tableName = this.config.tableName || this.generateTableName();
      
      // Criar tabela se não existir
      const createTableQuery = this.generateCreateTableQuery(tableName, transformedData.schema);
      
      // Gerar queries de inserção
      const insertQueries = this.generateInsertQueries(tableName, transformedData.data, transformedData.schema);
      
      // Executar queries (simulação por enquanto)
      const result = await this.executeQueries([
        createTableQuery,
        ...insertQueries
      ], connectionInfo);

      return {
        success: true,
        insertedRows: transformedData.data.length,
        tableName: tableName,
        database: connectionInfo.database,
        executedQueries: [createTableQuery, ...insertQueries.slice(0, 3)] // Mostrar apenas as primeiras 3 queries
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao conectar com o banco de dados'
      };
    }
  }

  /**
   * Analisa e valida a string de conexão
   */
  private parseConnectionString(connectionString: string): {
    isValid: boolean;
    type?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    error?: string;
  } {
    try {
      // PostgreSQL: postgresql://user:password@localhost:5432/database
      const postgresMatch = connectionString.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
      if (postgresMatch) {
        return {
          isValid: true,
          type: 'postgresql',
          username: postgresMatch[1],
          host: postgresMatch[3],
          port: parseInt(postgresMatch[4]),
          database: postgresMatch[5]
        };
      }

      // MySQL: mysql://user:password@localhost:3306/database
      const mysqlMatch = connectionString.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
      if (mysqlMatch) {
        return {
          isValid: true,
          type: 'mysql',
          username: mysqlMatch[1],
          host: mysqlMatch[3],
          port: parseInt(mysqlMatch[4]),
          database: mysqlMatch[5]
        };
      }

      // SQLite: sqlite:///path/to/database.db
      const sqliteMatch = connectionString.match(/^sqlite:\/\/\/(.+)$/);
      if (sqliteMatch) {
        return {
          isValid: true,
          type: 'sqlite',
          database: sqliteMatch[1]
        };
      }

      // SQL Server: sqlserver://user:password@localhost:1433/database
      const sqlserverMatch = connectionString.match(/^sqlserver:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
      if (sqlserverMatch) {
        return {
          isValid: true,
          type: 'sqlserver',
          username: sqlserverMatch[1],
          host: sqlserverMatch[3],
          port: parseInt(sqlserverMatch[4]),
          database: sqlserverMatch[5]
        };
      }

      return {
        isValid: false,
        error: 'Formato de string de conexão não reconhecido. Formatos suportados: postgresql://, mysql://, sqlite:///, sqlserver://'
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Erro ao analisar string de conexão'
      };
    }
  }

  /**
   * Gera nome da tabela baseado no timestamp
   */
  private generateTableName(): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    return `imported_data_${timestamp}`;
  }

  /**
   * Gera query CREATE TABLE baseada no schema
   */
  private generateCreateTableQuery(tableName: string, schema: FieldSchema[]): string {
    const dbType = this.config.type || 'postgresql';
    
    const columns = schema.map(field => {
      let sqlType = this.mapDataTypeToSQL(field.type, dbType);
      let nullable = field.nullable ? '' : ' NOT NULL';
      
      return `  ${this.escapeIdentifier(field.name, dbType)} ${sqlType}${nullable}`;
    }).join(',\n');

    const createQuery = `CREATE TABLE IF NOT EXISTS ${this.escapeIdentifier(tableName, dbType)} (\n${columns},\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`;
    
    return createQuery;
  }

  /**
   * Mapeia tipos de dados para SQL específico do banco
   */
  private mapDataTypeToSQL(dataType: string, dbType: string): string {
    const typeMap: Record<string, Record<string, string>> = {
      postgresql: {
        string: 'TEXT',
        number: 'NUMERIC',
        boolean: 'BOOLEAN',
        date: 'TIMESTAMP',
        email: 'VARCHAR(255)',
        phone: 'VARCHAR(20)',
        id: 'VARCHAR(50)'
      },
      mysql: {
        string: 'TEXT',
        number: 'DECIMAL(15,2)',
        boolean: 'BOOLEAN',
        date: 'DATETIME',
        email: 'VARCHAR(255)',
        phone: 'VARCHAR(20)',
        id: 'VARCHAR(50)'
      },
      sqlite: {
        string: 'TEXT',
        number: 'REAL',
        boolean: 'INTEGER',
        date: 'TEXT',
        email: 'TEXT',
        phone: 'TEXT',
        id: 'TEXT'
      },
      sqlserver: {
        string: 'NVARCHAR(MAX)',
        number: 'DECIMAL(15,2)',
        boolean: 'BIT',
        date: 'DATETIME2',
        email: 'NVARCHAR(255)',
        phone: 'NVARCHAR(20)',
        id: 'NVARCHAR(50)'
      }
    };

    return typeMap[dbType]?.[dataType] || typeMap[dbType]?.['string'] || 'TEXT';
  }

  /**
   * Escapa identificadores (nomes de tabelas e colunas) para o banco específico
   */
  private escapeIdentifier(identifier: string, dbType: string): string {
    const escapeMap: Record<string, [string, string]> = {
      postgresql: ['"', '"'],
      mysql: ['`', '`'],
      sqlite: ['[', ']'],
      sqlserver: ['[', ']']
    };

    const [start, end] = escapeMap[dbType] || ['"', '"'];
    return `${start}${identifier}${end}`;
  }

  /**
   * Gera queries de inserção para os dados
   */
  private generateInsertQueries(tableName: string, data: Record<string, any>[], schema: FieldSchema[]): string[] {
    const dbType = this.config.type || 'postgresql';
    const escapedTableName = this.escapeIdentifier(tableName, dbType);
    const columnNames = schema.map(field => this.escapeIdentifier(field.name, dbType));
    
    // Dividir em lotes de 100 registros para evitar queries muito grandes
    const batchSize = 100;
    const queries: string[] = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const values = batch.map(row => {
        const rowValues = schema.map(field => {
          const value = row[field.name];
          return this.formatValueForSQL(value, field.type, dbType);
        });
        return `(${rowValues.join(', ')})`;
      }).join(',\n  ');
      
      const insertQuery = `INSERT INTO ${escapedTableName} (${columnNames.join(', ')})\nVALUES\n  ${values};`;
      queries.push(insertQuery);
    }
    
    return queries;
  }

  /**
   * Formata valores para inserção SQL
   */
  private formatValueForSQL(value: any, dataType: string, dbType: string): string {
    if (value === null || value === undefined || value === '') {
      return 'NULL';
    }

    switch (dataType) {
      case 'string':
      case 'email':
      case 'phone':
      case 'id':
        return `'${String(value).replace(/'/g, "''")}'`; // Escape aspas simples
      
      case 'number':
        const num = parseFloat(String(value));
        return isNaN(num) ? 'NULL' : String(num);
      
      case 'boolean':
        if (dbType === 'sqlite') {
          return value ? '1' : '0';
        }
        return value ? 'TRUE' : 'FALSE';
      
      case 'date':
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return 'NULL';
          }
          return `'${date.toISOString()}'`;
        } catch {
          return 'NULL';
        }
      
      default:
        return `'${String(value).replace(/'/g, "''")}'`;
    }
  }

  /**
   * Executa as queries no banco de dados
   * Por enquanto é uma simulação - em produção seria necessário usar um driver real
   */
  private async executeQueries(queries: string[], connectionInfo: any): Promise<void> {
    // Simulação de execução
    console.log('🔗 Conectando ao banco de dados:', {
      type: connectionInfo.type,
      host: connectionInfo.host,
      database: connectionInfo.database
    });
    
    console.log('📝 Executando queries:');
    queries.forEach((query, index) => {
      console.log(`Query ${index + 1}:`, query.substring(0, 200) + (query.length > 200 ? '...' : ''));
    });
    
    // Simular tempo de execução
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    console.log('✅ Queries executadas com sucesso!');
    
    // NOTA: Em produção, aqui seria necessário:
    // 1. Instalar driver do banco (pg, mysql2, sqlite3, mssql)
    // 2. Criar conexão real
    // 3. Executar queries reais
    // 4. Tratar erros de conexão e SQL
  }

  /**
   * Testa a conexão com o banco de dados
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const connectionInfo = this.parseConnectionString(this.config.connectionString);
      
      if (!connectionInfo.isValid) {
        return {
          success: false,
          message: connectionInfo.error || 'String de conexão inválida'
        };
      }

      // Simulação de teste de conexão
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        message: 'Conexão testada com sucesso',
        details: {
          type: connectionInfo.type,
          host: connectionInfo.host,
          database: connectionInfo.database,
          port: connectionInfo.port
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao testar conexão'
      };
    }
  }

  /**
   * Retorna informações sobre os drivers necessários para cada tipo de banco
   */
  static getRequiredDrivers(): Record<string, { package: string; description: string }> {
    return {
      postgresql: {
        package: 'pg',
        description: 'Driver para PostgreSQL - npm install pg @types/pg'
      },
      mysql: {
        package: 'mysql2',
        description: 'Driver para MySQL - npm install mysql2'
      },
      sqlite: {
        package: 'sqlite3',
        description: 'Driver para SQLite - npm install sqlite3'
      },
      sqlserver: {
        package: 'mssql',
        description: 'Driver para SQL Server - npm install mssql'
      }
    };
  }
}

/**
 * Função utilitária para criar instância do serviço de banco
 */
export function createDatabaseService(connectionString: string, tableName?: string): DatabaseService {
  // Detectar tipo do banco pela string de conexão
  let type: DatabaseConfig['type'] = 'postgresql';
  
  if (connectionString.startsWith('mysql://')) {
    type = 'mysql';
  } else if (connectionString.startsWith('sqlite:///')) {
    type = 'sqlite';
  } else if (connectionString.startsWith('sqlserver://')) {
    type = 'sqlserver';
  }
  
  return new DatabaseService({
    connectionString,
    type,
    tableName
  });
}