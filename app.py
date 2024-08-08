from flask import Flask, render_template, request, jsonify
import cx_Oracle
import pandas as pd
from fuzzywuzzy import fuzz
import re

app = Flask(__name__)

# Oracle database connection details
db_username = 'PRATIK_RAUT'
db_password = 'Today1207#'
db_host = 'az-sasprd.azurectwkglobal.com'
db_port = 1521
db_service_name = 'GRCCIOX'
dsn_tns = cx_Oracle.makedsn(db_host, db_port, service_name=db_service_name)

common_words = ['BANK', 'CREDIT', 'UNION', 'HOLDING', 'FEDRAL']

def remove_common_words(company_name):
    pattern = re.compile(r'\b(?:' + '|'.join(common_words) + r')\b', re.IGNORECASE)
    return pattern.sub('', company_name).strip()

def fetch_ibanknet_data(company_name, company_address, company_website):
    try:
        conn = cx_Oracle.connect(db_username, db_password, dsn_tns)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM dev_fccdw.IBANKNET_DATA')
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        df_ibanknet = pd.DataFrame(rows, columns=columns)

        print("Raw IBANKNET_DATA rows:", len(df_ibanknet))  # Debug: Log number of rows fetched

        if company_name:
            company_name = remove_common_words(company_name.upper())
            df_ibanknet['NAME_MATCH'] = df_ibanknet['CUSTOMER_NAME'].apply(lambda x: fuzz.partial_ratio(company_name, x.upper()))
            df_ibanknet = df_ibanknet[df_ibanknet['NAME_MATCH'] > 70]
        if company_address:
            df_ibanknet['ADDRESS_MATCH'] = df_ibanknet['COMPANY_ADDRESS'].apply(lambda x: fuzz.partial_ratio(company_address, x))
            df_ibanknet = df_ibanknet[df_ibanknet['ADDRESS_MATCH'] > 70]
        if company_website:
            df_ibanknet['WEBSITE_MATCH'] = df_ibanknet['COMPANY_WEBSITE'].apply(lambda x: fuzz.partial_ratio(company_website, x))
            df_ibanknet = df_ibanknet[df_ibanknet['WEBSITE_MATCH'] > 70]

        print("Filtered IBANKNET_DATA rows:", len(df_ibanknet))  # Debug: Log number of filtered rows

        results = df_ibanknet.to_dict(orient='records')
    except Exception as e:
        print("Error fetching IBANKNET_DATA:", str(e))  # Log any errors during fetching
        results = []
    finally:
        if conn:
            conn.close()

    return results

def fetch_fdic_data(company_name):
    try:
        conn = cx_Oracle.connect(db_username, db_password, dsn_tns)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM dev_fccdw.FDIC_DATA')
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        df_fdic = pd.DataFrame(rows, columns=columns)

        print("Raw FDIC_DATA rows:", len(df_fdic))  # Debug: Log number of rows fetched

        if company_name:
            company_name = remove_common_words(company_name.upper())
            df_fdic['NAME_MATCH'] = df_fdic['NAME'].apply(lambda x: fuzz.partial_ratio(company_name, x.upper()))
            df_fdic = df_fdic[df_fdic['NAME_MATCH'] > 75]

        print("Filtered FDIC_DATA rows:", len(df_fdic))  # Debug: Log number of filtered rows

        results = df_fdic.to_dict(orient='records')
    except Exception as e:
        print("Error fetching FDIC_DATA:", str(e))  # Log any errors during fetching
        results = []
    finally:
        if conn:    
            conn.close()

    return results

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    data = request.json
    company_name = data.get('companyName')
    company_address = data.get('companyAddress')
    company_website = data.get('companyWebsite')

    ibanknet_results = fetch_ibanknet_data(company_name, company_address, company_website)
    fdic_results = fetch_fdic_data(company_name)

    results = {
        'ibanknet': ibanknet_results,
        'fdic': fdic_results
    }

    print("Results sent to client:", results)  # Debug: Log results being sent to the client
    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True)
