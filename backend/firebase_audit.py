#!/usr/bin/env python3
"""
Audita la estructura de Firestore para PhoenixApp.

Requiere:
  pip install firebase-admin
  export GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json

Opcional:
  export FIREBASE_PROJECT_ID=tu-proyecto
  export FIREBASE_DB_ID=(default)   # si usas una BD distinta
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List, Optional

import firebase_admin
from firebase_admin import credentials, firestore


EXPECTED = {
    "rondas": {
        "required_fields": {
            "nombre": "string",
        }
    },
    "sitios": {
        "required_fields": {
            "nombre": "string",
        },
        "optional_fields": {
            "coordenadas": "GeoPoint|map",
        },
    },
    "mantenimientos": {
        "required_fields": {
            "estado": "string",
            "ronda": "DocumentReference",
            "Sitio": "DocumentReference",
        },
        "optional_fields": {
            "tiposMantenimiento": "array|string|map",
        },
    },
}


def init_firestore() -> firestore.client:
    if not firebase_admin._apps:
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            print("ERROR: Define GOOGLE_APPLICATION_CREDENTIALS con tu service account.")
            sys.exit(1)
        if not os.path.exists(cred_path):
            print(f"ERROR: No existe el archivo de credenciales: {cred_path}")
            sys.exit(1)

        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)

    project_id = os.environ.get("FIREBASE_PROJECT_ID")
    db_id = os.environ.get("FIREBASE_DB_ID", "(default)")
    return firestore.client(project_id=project_id, database_id=db_id)


def type_name(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "map"
    # DocumentReference, GeoPoint, Timestamp, etc
    return value.__class__.__name__


def audit_collection(
    db: firestore.client, collection: str, expected: Dict[str, Any]
) -> Dict[str, Any]:
    required = expected.get("required_fields", {})
    optional = expected.get("optional_fields", {})
    missing_required_docs: List[Dict[str, Any]] = []
    type_mismatches: List[Dict[str, Any]] = []

    docs = list(db.collection(collection).stream())
    for doc in docs:
        data = doc.to_dict() or {}

        for field, expected_type in required.items():
            if field not in data:
                missing_required_docs.append(
                    {"collection": collection, "doc_id": doc.id, "field": field}
                )
            else:
                actual_type = type_name(data.get(field))
                # No validamos tipo estricto; solo alertamos si es claramente distinto.
                if expected_type not in actual_type and expected_type.lower() not in actual_type.lower():
                    type_mismatches.append(
                        {
                            "collection": collection,
                            "doc_id": doc.id,
                            "field": field,
                            "expected": expected_type,
                            "actual": actual_type,
                        }
                    )

        for field, _ in optional.items():
            if field in data:
                # Solo registramos tipo para inspección
                pass

    return {
        "collection": collection,
        "count": len(docs),
        "missing_required": missing_required_docs,
        "type_mismatches": type_mismatches,
    }


def main() -> None:
    db = init_firestore()
    results = []

    for collection, expected in EXPECTED.items():
        results.append(audit_collection(db, collection, expected))

    print(json.dumps({"audit": results}, indent=2, ensure_ascii=True))


if __name__ == "__main__":
    main()

