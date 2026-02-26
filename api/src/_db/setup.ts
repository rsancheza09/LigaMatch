import { exec, ExecException } from 'child_process';
import '../../environment';

const DATABASE_HOST =
  process.env.DATABASE_HOST || 'postgresql://postgres@127.0.0.1:5432';
const DATABASE_NAME =
  process.env.DATABASE_NAME || 'ligamatch_development';

const checkActivePgConnections = `psql -d ${DATABASE_HOST} -c '\\x' -c "SELECT * FROM pg_stat_activity where datname = '${DATABASE_NAME}';" | grep ${DATABASE_NAME}`;

const exitStatusCodeZero = (code: number) => {
  if (code === 0) {
    console.error('Database has active connections');
    process.exit(1);
  }
};
exec(checkActivePgConnections).on('exit', exitStatusCodeZero);

const runSetupSql = `psql -d ${DATABASE_HOST} -a --set=database=${DATABASE_NAME} -f 'src/_db/setup.sql'`;

const logStdoutStderr = (
  error: ExecException | null,
  stdout: string,
  stderr: string,
) => {
  if (error) console.error(error);
  if (stderr) console.warn(stderr);
  if (stdout) console.log(stdout);
};

exec(runSetupSql, logStdoutStderr);
