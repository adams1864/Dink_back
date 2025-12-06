import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';

async function main(){
  try{
    const res = await db.execute(
      sql.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`)
    );
    console.log((res as any).rows ?? res);
  }catch(e){
    console.error('error', e);
  }finally{
    process.exit(0);
  }
}

main();
