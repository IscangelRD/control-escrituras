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

// Obtener correctamente el usuario de la sesión

$usuario_id = current_user_id();

if (!$usuario_id) {
    json_response(false, "No se pudo identificar al usuario", null, 401);
    exit;
}

try {

    $sql = "
        UPDATE expedientes
        SET
            eliminado = 1,
            eliminado_en = NOW(),
            eliminado_por = ?
        WHERE id = ?
        AND eliminado = 0
    ";

    $stmt = $pdo->prepare($sql);

    $stmt->execute([
        $usuario_id,
        $id
    ]);

    if ($stmt->rowCount() === 0) {
        json_response(
            false,
            "No se encontró el expediente o ya fue eliminado",
            null,
            404
        );
        exit;
    }

    json_response(
        true,
        "Expediente eliminado correctamente"
    );

} catch (Exception $e) {

    error_log($e->getMessage());

    json_response(
        false,
        "Error al eliminar expediente",
        null,
        500
    );
}