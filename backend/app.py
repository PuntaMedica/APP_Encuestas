# app.py
from flask import Flask, request, jsonify, send_file
import pandas as pd
import os
import pyodbc # Librería para SQL Server
import json
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- ORIGINAL (EXCEL) ---
# EXCEL_FILE = "encuestas.xlsx"
# USERS_FILE = "usuarios.xlsx"

# --- NUEVO (SQL SERVER) ---
SQL_CONN_STR = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=DESKTOP-EO74OCH\\SQLEXPRESS;"
    "Database=punta_medica;"
    "Trusted_Connection=yes;"
    "Encrypt=no;"
    "TrustServerCertificate=yes;"
)

def get_db_connection():
    return pyodbc.connect(SQL_CONN_STR)

# --- NUEVO: Inicialización de Tabla en SQL ---
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EncuestasGeneral' AND xtype='U')
        CREATE TABLE EncuestasGeneral (
            ID INT IDENTITY(1,1) PRIMARY KEY,
            Nombre VARCHAR(255),
            Fecha VARCHAR(100),
            Respuestas_JSON VARCHAR(MAX),
            Comentario VARCHAR(MAX)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def validate_user(user, password):
    """Valida que exista un registro en SQL Server (Antes en usuarios.xlsx)"""
    # --- ORIGINAL (EXCEL) ---
    # if not os.path.exists(USERS_FILE): return False
    # df_users = pd.read_excel(USERS_FILE)
    # match = df_users[(df_users["user"] == user) & (df_users["password"] == password)]
    # return not match.empty

    # --- NUEVO (SQL SERVER) ---
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT [user] FROM UsuariosWeb WHERE [user]=? AND [password]=?", (user, password))
    row = cursor.fetchone()
    conn.close()
    return row is not None

@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    user = data.get("user", "")
    password = data.get("password", "")
    if validate_user(user, password):
        return jsonify({"success": True}), 200
    else:
        return jsonify({"success": False, "mensaje": "Credenciales inválidas"}), 401

@app.route("/guardar", methods=["POST"])
def guardar():
    data = request.json
    
    # --- ORIGINAL (EXCEL) ---
    # df = pd.DataFrame([{"Nombre": data.get("nombre"), "Fecha": data.get("fecha"), **data.get("respuestas", {}), "Comentario": data.get("comentario", "")}])
    # if os.path.exists(EXCEL_FILE):
    #     df_existente = pd.read_excel(EXCEL_FILE)
    #     df = pd.concat([df_existente, df], ignore_index=True)
    # df.to_excel(EXCEL_FILE, index=False)

    # --- NUEVO (SQL SERVER) ---
    nombre = data.get("nombre")
    fecha = data.get("fecha")
    respuestas = json.dumps(data.get("respuestas", {})) # Convertimos dict a string JSON
    comentario = data.get("comentario", "")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO EncuestasGeneral (Nombre, Fecha, Respuestas_JSON, Comentario) VALUES (?, ?, ?, ?)", 
                   (nombre, fecha, respuestas, comentario))
    conn.commit()
    conn.close()
    
    return jsonify({"mensaje": "Encuesta guardada correctamente"}), 200

@app.route("/datos-grafica", methods=["GET"])
def datos_grafica():
    # --- ORIGINAL (EXCEL) ---
    # if not os.path.exists(EXCEL_FILE): return jsonify({"num_encuestas": 0, "promedios": []})
    # df = pd.read_excel(EXCEL_FILE)
    # cols_preg = [c for c in df.columns if c not in ["Nombre", "Fecha", "Comentario"]]
    # ... (procesamiento manual de promedios)

    # --- NUEVO (SQL SERVER + PANDAS) ---
    conn = get_db_connection()
    df_sql = pd.read_sql("SELECT Respuestas_JSON FROM EncuestasGeneral", conn)
    conn.close()

    if df_sql.empty:
        return jsonify({"num_encuestas": 0, "promedios": []})

    # Expandimos el JSON a columnas para calcular promedios igual que antes
    df_respuestas = pd.DataFrame([json.loads(x) for x in df_sql['Respuestas_JSON']])
    
    promedios = []
    for col in df_respuestas.columns:
        df_respuestas[col] = pd.to_numeric(df_respuestas[col], errors="coerce")
        prom = df_respuestas[col].mean()
        promedios.append({"pregunta": col, "promedio": round(prom, 2) if pd.notnull(prom) else 0})

    return jsonify({"num_encuestas": len(df_sql), "promedios": promedios})

@app.route("/descargar-excel", methods=["GET"])
def descargar_excel():
    # --- ORIGINAL (EXCEL) ---
    # if os.path.exists(EXCEL_FILE): return send_file(EXCEL_FILE, as_attachment=True)

    # --- NUEVO (SQL SERVER: Generar Excel al vuelo) ---
    conn = get_db_connection()
    df_base = pd.read_sql("SELECT * FROM EncuestasGeneral", conn)
    conn.close()

    if df_base.empty:
        return jsonify({"mensaje": "No hay datos"}), 404

    # Aplanamos el JSON para que el Excel sea legible
    df_resp = pd.DataFrame([json.loads(x) for x in df_base['Respuestas_JSON']])
    df_final = pd.concat([df_base[["ID", "Nombre", "Fecha", "Comentario"]], df_resp], axis=1)

    temp_file = "encuestas_sql.xlsx"
    df_final.to_excel(temp_file, index=False)
    return send_file(temp_file, as_attachment=True)

@app.route('/ping')
def ping():
    return 'pong', 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5500, debug=True)