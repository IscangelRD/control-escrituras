<?php

require_once "../../config/db.php";
require_once "../../config/response.php";
require_once "../../config/session.php";

require_login();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    json_response(false, "Método no permitido", null, 405);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$id = filter_var(
    $data["id"] ?? null,
    FILTER_VALIDATE_INT
);

if (!$id || $id <= 0) {
    json_response(false, "ID de expediente inválido", null, 400);
    exit;
}

try {

    // Restaurar expediente sin modificar su estado original

    $sql = "
        UPDATE expedientes
        SET
            eliminado = 0,
            eliminado_en = NULL,
            eliminado_por = NULL
        WHERE id = ?
        AND eliminado = 1
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {

        json_response(
            false,
            "El expediente no existe o ya fue restaurado",
            null,
            404
        );

        exit;
    }

    json_response(
        true,
        "Expediente restaurado correctamente",
        [
            "id" => $id
        ]
    );

} catch (Exception $e) {

    error_log($e->getMessage());

    json_response(
        false,
        "Error al restaurar el expediente",
        null,
        500
    );
}