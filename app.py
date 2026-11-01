from flask import Flask, request, jsonify
from flask_cors import CORS
from sympy import symbols, Eq, solve, factor, expand, sympify
from sympy.solvers.inequalities import solve_univariate_inequality
from sympy.core.relational import Relational
import re

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 16 * 1024
x = symbols("x")
MAX_EXPRESSION_LENGTH = 300

# فلتر أولي للأحرف والعمليات الرياضية المسموحة
ALLOWED_EXPRESSION = re.compile(r"^[0-9xX+\-*/().\s^<>=!]+$")


def parse_expression(value):
    if not isinstance(value, str):
        raise ValueError("L'expression doit être saisie sous forme de texte.")

    value = value.strip()

    if not value:
        raise ValueError("Veuillez saisir une expression mathématique.")

    if len(value) > MAX_EXPRESSION_LENGTH:
        raise ValueError("L'expression est très longue.")

    if not ALLOWED_EXPRESSION.fullmatch(value):
        raise ValueError(
            "Utilisez uniquement des nombres, la variable x et les opérations mathématiques autorisées."
        )

    return sympify(value, locals={"x": x}, convert_xor=True)


def success(title, answer, steps):
    return jsonify({
        "success": True,
        "title": title,
        "answer": answer,
        "steps": [str(step) for step in steps]
    })


@app.get("/")
def home():
    return jsonify({
        "name": "Math Assistant API",
        "status": "online",
        "message": "Math Assistant API is running."
    })


@app.get("/api/health")
def health():
    return jsonify({
        "success": True,
        "status": "ok"
    })


@app.post("/api/calculate")
def calculate():

    try:
        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "success": False,
                "error": "Utilisez uniquement des nombres, la variable x et les opérations mathématiques autorisées. Les données transmises ne sont pas valides.",
                "steps": []
            }), 400

        mode = data.get("mode")

        # حل المعادلات
        if mode == "equation":

            left = parse_expression(data.get("left", ""))
            right = parse_expression(data.get("right", ""))

            equation = Eq(left, right)
            solutions = solve(equation, x)

            return success(
                "Résoudre l'équation",
                [str(item) for item in solutions],
                [
                    f"Le côté gauche: {left}",
                    f"Le côté droit: {right}",
                    f"L'équation: {equation}",
                    f"Les solutions: {solutions}"
                ]
            )

        # حل المتراجحات
        if mode == "inequality":

            relation_text = data.get("expression", "")
            relation = parse_expression(relation_text)

            if not isinstance(relation, Relational):
                raise ValueError(
                    "Saisissez une inéquation contenant <, >, <= ou >=."
                )

            result = solve_univariate_inequality(
                relation,
                x,
                relational=True
            )

            return success(
                "Résoudre l'inéquation",
                str(result),
                [
                    f"L'inéquation: {relation}",
                    f"Ensemble des solutions: {result}"
                ]
            )

        # التحليل والنشر
        if mode in ("factor", "expand"):

            expression = parse_expression(
                data.get("expression", "")
            )

            result = (
                factor(expression)
                if mode == "factor"
                else expand(expression)
            )

            title = (
                "Analyse de l'expression"
                if mode == "factor"
                else "نشر التعبير"
            )

            return success(
                title,
                str(result),
                [
                    f"L'expression originale: {expression}",
                    f"Le résultat: {result}"
                ]
            )

        return jsonify({
            "success": False,
            "error": "L'opération demandée est inconnue..",
            "steps": []
        }), 400

    except Exception as error:

        message = (
            str(error)
            if isinstance(error, ValueError)
            else "Impossible de traiter l'expression. Vérifiez la formulation mathématique."
        )

        return jsonify({
            "success": False,
            "error": message,
            "steps": []
        }), 400


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
