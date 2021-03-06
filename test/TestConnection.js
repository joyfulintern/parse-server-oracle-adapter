/* Copyright (c) 2018, 2019, Oracle and/or its affiliates. All rights reserved. */

/** ****************************************************************************
 *
 * You may not use the identified files except in compliance with the Apache
 * License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * NAME
 *   example.js
 *
 * DESCRIPTION
 *   A basic node-oracledb example using Node.js 8's async/await syntax.
 *
 *   For a connection pool example see connectionpool.js
 *   For a ResultSet example see resultset2.js
 *   For a query stream example see selectstream.js
 *   For a Promise example see promises.js
 *   For a callback example see select1.js
 *
 *   This example requires node-oracledb 2.2 or later.
 *
 **************************************************************************** */

// Using a fixed Oracle time zone helps avoid machine and deployment differences
// import 'babel-polyfill';

process.env.ORA_SDTZ = 'UTC';

const oracledb = require('oracledb');

const dbConfig = {
  user: '',
  password: '',
  connectString: '',
};

async function run() {
  let connection;

  try {
    let sql,
      binds,
      options,
      result;

    connection = await oracledb.getConnection({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
    });

    // Create a table

    await connection.execute(
      `BEGIN
         EXECUTE IMMEDIATE 'DROP TABLE mytab1';
         EXCEPTION
         WHEN OTHERS THEN
           IF SQLCODE NOT IN (-00942) THEN
             RAISE;
           END IF;
       END;`);

    await connection.execute(
      'CREATE TABLE mytab1 (id NUMBER, data VARCHAR2(20), remark clob)');

    // Insert some data

    sql = 'INSERT INTO mytab1 VALUES (:1, :2, :3)';

    binds = [[101, 'Alpha', JSON.stringify({ aa: 123 })], [102, 'Beta', JSON.stringify({ bb: 456 })], [103, 'Gamma', JSON.stringify({ cc: 789 })]];

    // For a complete list of options see the documentation.
    options = {
      autoCommit: true,
      // batchErrors: true,  // continue processing even if there are data errors
      bindDefs: [
        { type: oracledb.NUMBER },
        { type: oracledb.STRING, maxSize: 20 },
        { type: oracledb.CLOB, maxSize: 4000 },
      ],
    };

    result = await connection.executeMany(sql, binds, options);

    console.log('Number of rows inserted:', result.rowsAffected);

    // Query the data

    sql = 'SELECT * FROM mytab1';

    binds = {};

    // For a complete list of options see the documentation.
    options = {
      outFormat: oracledb.OBJECT, // query result format
      // extendedMetaData: true,   // get extra metadata
      // fetchArraySize: 100       // internal buffer allocation size for tuning
    };

    result = await connection.execute(sql, binds, options);

    const remark = await getLobData(result.rows[0].REMARK);

    console.log('Column metadata: ', result.metaData);
    console.log('Query results: ');
    console.log(result.rows);

    // Show the date.  The value of ORA_SDTZ affects the output

    sql = 'SELECT TO_CHAR(CURRENT_DATE, \'DD-Mon-YYYY HH24:MI\') AS CD FROM DUAL';
    result = await connection.execute(sql, binds, options);
    console.log('Current date query results: ');
    console.log(result.rows[0].CD);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

function getLobData(lob) {
  let str = '';
  return new Promise((resolve, reject) => {
    lob.setEncoding('utf8'); // set the encoding so we get a 'string' not a 'buffer'
    lob.on('data', (chunk) => {
      str += chunk; // or use Buffer.concat() for BLOBS
    });
    lob.on('error', (err) => {
      reject(err);
    });
    lob.on('end', () => {
      resolve(str);
    });
  });
}

run();
