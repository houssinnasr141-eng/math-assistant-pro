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
        raise ValueError("يجب إدخال التعبير كنص.")

    value = value.strip()

    if not value:
        raise ValueError("الرجاء إدخال تعبير رياضي.")

    if len(value) > MAX_EXPRESSION_LENGTH:
        raise ValueError("التعبير طويل جدًا.")

    if not ALLOWED_EXPRESSION.fullmatch(value):
        raise ValueError(
            "استعمل الأرقام والمتغير x والعمليات الرياضية المسموحة فقط."
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
                "error": "البيانات المرسلة غير صالحة.",
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
                "حل المعادلة",
                [str(item) for item in solutions],
                [
                    f"الطرف الأيسر: {left}",
                    f"الطرف الأيمن: {right}",
                    f"المعادلة: {equation}",
                    f"الحلول: {solutions}"
                ]
            )

        # حل المتراجحات
        if mode == "inequality":

            relation_text = data.get("expression", "")
            relation = parse_expression(relation_text)

            if not isinstance(relation, Relational):
                raise ValueError(
                    "أدخل متراجحة تحتوي على < أو > أو <= أو >=."
                )

            result = solve_univariate_inequality(
                relation,
                x,
                relational=True
            )

            return success(
                "حل المتراجحة",
                str(result),
                [
                    f"المتراجحة: {relation}",
                    f"مجموعة الحلول: {result}"
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
                "تحليل التعبير"
                if mode == "factor"
                else "نشر التعبير"
            )

            return success(
                title,
                str(result),
                [
                    f"التعبير الأصلي: {expression}",
                    f"النتيجة: {result}"
                ]
            )

        return jsonify({
            "success": False,
            "error": "العملية المطلوبة غير معروفة.",
            "steps": []
        }), 400

    except Exception as error:

        message = (
            str(error)
            if isinstance(error, ValueError)
            else "تعذّرت معالجة التعبير. تحقق من الصياغة الرياضية."
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