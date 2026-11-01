
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sympy import (
    symbols, Eq, solve, factor, expand, sympify,
    simplify, latex
)
from sympy.core.sympify import SympifyError
import re

app = Flask(__name__)
CORS(app)

x = symbols("x")

@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/style.css")
def css():
    return send_from_directory(".", "style.css")


@app.route("/script.js")
def javascript():
    return send_from_directory(".", "script.js")


@app.route("/api/health")
def health():
    return jsonify({
        "status": "online",
        "message": "Math Assistant Pro is running."
    })


def parse_expression(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("Veuillez entrer une expression.")

    if len(value) > 250:
        raise ValueError("Expression trop longue.")

    if not re.fullmatch(r"[0-9a-zA-Z_xX+\-*/^().\s]+", value):
        raise ValueError("Caractères non autorisés.")

    return sympify(
        value,
        locals={"x": x},
        evaluate=True
    )


@app.route("/api/calculate", methods=["POST"])
def calculate():
    try:
        data = request.get_json(silent=True) or {}

        operation = data.get("operation")
        result = None
        steps = []

        if operation == "equation":
            left = parse_expression(data.get("left", ""))
            right = parse_expression(data.get("right", ""))

            equation = Eq(left, right)
            solutions = solve(equation, x)

            result = [str(value) for value in solutions]

            steps = [
                "Équation initiale : " + str(equation),
                "On regroupe les termes dans un même membre.",
                "On résout l'équation par rapport à x."
            ]

        elif operation == "factor":
            expression = parse_expression(data.get("expression", ""))
            result = str(factor(expression))

            steps = [
                "Expression initiale : " + str(expression),
                "On recherche les facteurs communs.",
                "Résultat de la factorisation."
            ]

        elif operation == "expand":
            expression = parse_expression(data.get("expression", ""))
            result = str(expand(expression))

            steps = [
                "Expression initiale : " + str(expression),
                "On développe les produits.",
                "On réduit les termes semblables."
            ]

        elif operation == "simplify":
            expression = parse_expression(data.get("expression", ""))
            result = str(simplify(expression))

            steps = [
                "Expression initiale : " + str(expression),
                "On simplifie l'expression.",
                "Résultat simplifié."
            ]

        else:
            return jsonify({
                "success": False,
                "error": "Opération inconnue."
            }), 400

        return jsonify({
            "success": True,
            "result": result,
            "steps": steps
        })

    except (ValueError, SympifyError, TypeError, SyntaxError) as error:
        return jsonify({
            "success": False,
            "error": str(error)
        }), 400

    except Exception:
        return jsonify({
            "success": False,
            "error": "Une erreur est survenue pendant le calcul."
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
