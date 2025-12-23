from flask import Flask, request, jsonify, send_file
import pandas as pd
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

EXCEL_FILE = "encuestas.xlsx"
USERS_FILE = "usuarios.xlsx"

def validate_user(user, password):
    """Valida que exista un registro en usuarios.xlsx con ese user/password."""
    if not os.path.exists(USERS_FILE):
        return False
    df_users = pd.read_excel(USERS_FILE)
    # Asegúrate de que las columnas de tu Excel se llamen 'user' y 'password'
    match = df_users[(df_users["user"] == user) & (df_users["password"] == password)]
    return not match.empty

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
    df = pd.DataFrame([{
        "Nombre": data.get("nombre"),
        "Fecha": data.get("fecha"),
        **data.get("respuestas", {}),
        "Comentario": data.get("comentario", "")
    }])
    if os.path.exists(EXCEL_FILE):
        df_existente = pd.read_excel(EXCEL_FILE)
        df = pd.concat([df_existente, df], ignore_index=True)
    df.to_excel(EXCEL_FILE, index=False)
    return jsonify({"mensaje": "Encuesta guardada correctamente"}), 200

@app.route("/datos-grafica", methods=["GET"])
def datos_grafica():
    if not os.path.exists(EXCEL_FILE):
        return jsonify({"num_encuestas": 0, "promedios": []})
    df = pd.read_excel(EXCEL_FILE)
    cols_preg = [c for c in df.columns if c not in ["Nombre", "Fecha", "Comentario"]]
    promedios = []
    for col in cols_preg:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        prom = df[col].mean(skipna=True)
        promedios.append({"pregunta": col, "promedio": round(prom, 2) if pd.notnull(prom) else 0})
    return jsonify({"num_encuestas": len(df), "promedios": promedios})

@app.route("/descargar-excel", methods=["GET"])
def descargar_excel():
    if os.path.exists(EXCEL_FILE):
        return send_file(EXCEL_FILE, as_attachment=True)
    else:
        return jsonify({"mensaje": "No se encontró el archivo"}), 404
    
@app.route('/ping')
def ping():
    return 'pong', 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5500, debug=True)
