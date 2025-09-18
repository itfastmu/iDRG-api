import mysql from 'mysql2';

interface DBConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}

const config: { db: DBConfig } = {
    db: {
        host: '192.168.20.190', // ganti dengan host yang sesuai
        user: 'fastabiq',      // ganti dengan user yang sesuai
        password: 'muhammadiyah',      // ganti dengan password yang sesuai
        database: 'fastabiq'   // ganti dengan nama database yang sesuai
    }
};
const pool = mysql.createPool(config.db);
const promisePool = pool.promise();

export async function sql<T extends mysql.ResultSetHeader>(sql: string, params?: any[]): Promise<T[]> {

    try {
        const [results] = await promisePool.query<T[]>(sql, params);
        return results;
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await promisePool.end();
    process.exit(0);
});
