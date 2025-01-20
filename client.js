import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
    host     : process.env.DB_HOST,
    user     : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_NAME,
    port     : process.env.DB_PORT,
    ssl      : {
        rejectUnauthorized: false
    }
});

// Query to fetch jitsu integration data
export const getJitsuIntegrations = async () => {
    try {
        const result = await client.query('SELECT tenant_id, host FROM dev.jitsu_integration');
        return result.rows;
    } catch (error) {
        console.error('Error fetching jitsu integrations:', error);
        throw error;
    }
};

export default client;
