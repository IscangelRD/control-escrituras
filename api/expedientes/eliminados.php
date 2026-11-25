<?php

require_once "../../config/db.php";
require_once "../../config/response.php";
require_once "../../config/session.php";

require_login();

if ($_SERVER["REQUEST_METHOD"] !== "GET") {
    json_response(false, "Método no permitido", null, 405);
    exit;
}

$buscar = trim($_GET["buscar"] ?? "");
$pagina = max(1, intval($_GET["page"] ?? 1));
$por_pagina = 10;

try {

    $where = "
        FROM expedientes e
        INNER JOIN clientes c ON c.id = e.cliente_id
        LEFT JOIN usuarios u ON u.id = e.eliminado_por
        WHERE e.eliminado = 1
        
    ";

    $params = [];

    // Buscador de expedientes eliminados

    if ($buscar !== "") {

        $where .= "
            AND (
                e.numero_expediente LIKE ?
                OR e.numero_escritura LIKE ?
                OR c.nombre LIKE ?
                OR e.tipo_acto LIKE ?
            )
        ";

        $like = "%" . $buscar . "%";

        $params = [
            $like,
            $like,
            $like,
            $like
        ];
    }

    // Contar expedientes eliminados

    $stmt_total = $pdo->prepare(
        "SELECT COUNT(*) " . $where
    );

    $stmt_total->execute($params);

    $total = (int) $stmt_total->fetchColumn();

    // Paginación de 10 en 10

    $total_paginas = max(
        1,
        (int) ceil($total / $por_pagina)
    );

    $pagina = min($pagina, $total_paginas);

    $offset = ($pagina - 1) * $por_pagina;

    // Consultar expedientes eliminados

    $sql = "
        SELECT
            e.id,
            e.numero_expediente,
            e.numero_escritura,
            e.tipo_acto,
            e.notaria,
            e.municipio,
            e.estado_actual,
            e.responsable_actual,
            e.fecha_recepcion,
            e.eliminado_en,
            e.eliminado_por,
            u.nombre AS eliminado_por_nombre,
            c.nombre AS cliente_nombre

        " . $where . "

        ORDER BY e.eliminado_en DESC, e.id DESC

        LIMIT " . intval($por_pagina) . "
        OFFSET " . intval($offset);

    $stmt = $pdo->prepare($sql);

    $stmt->execute($params);

    $expedientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_response(
        true,
        "Expedientes eliminados obtenidos correctamente",
        [
            "expedientes" => $expedientes,
            "total" => $total,
            "pagina" => $pagina,
            "por_pagina" => $por_pagina,
            "total_paginas" => $total_paginas
        ]
    );

} catch (Exception $e) {

    error_log($e->getMessage());

    json_response(
        false,
        "Error al consultar expedientes eliminados",
        null,
        500
    );
}