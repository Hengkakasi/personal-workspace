<?php
// api.php - 后端API接口
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
// 防止被搜索引擎索引
header('X-Robots-Tag: noindex, nofollow');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(
        "mysql:host=$db_host;dbname=$db_name;charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '数据库连接失败: ' . $e->getMessage()]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : null;

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

function generateId() {
    return bin2hex(random_bytes(16));
}

try {
    switch ($action) {
        // ============ 登录 ============
        case 'login':
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ? AND password = MD5(?)');
            $stmt->execute([$username, $password]);
            $user = $stmt->fetch();
            if ($user) {
                $token = bin2hex(random_bytes(32));
                echo json_encode(['success' => true, 'token' => $token, 'username' => $user['username']]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => '用户名或密码错误']);
            }
            break;


        // ============ 个人提升 - 树形结构 ============
        case 'get_growth_nodes':
            $stmt = $pdo->query('SELECT * FROM growth_nodes ORDER BY sort_order ASC, created_at ASC');
            echo json_encode($stmt->fetchAll());
            break;
        
        case 'save_growth_node':
            $parentId = $input['parent_id'] ?? null;
            if ($id) {
                $stmt = $pdo->prepare('UPDATE growth_nodes SET name=?, type=?, content=?, parent_id=?, sort_order=? WHERE id=?');
                $stmt->execute([
                    $input['name'],
                    $input['type'] ?? 'file',
                    $input['content'] ?? '',
                    $parentId,
                    $input['sort_order'] ?? 0,
                    $id
                ]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                // 计算同级最大 sort_order
                $stmtMax = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM growth_nodes WHERE parent_id <=> ?');
                $stmtMax->execute([$parentId]);
                $nextOrder = $stmtMax->fetch()['next_order'];
        
                $stmt = $pdo->prepare('INSERT INTO growth_nodes (id, name, type, content, parent_id, sort_order) VALUES (?,?,?,?,?,?)');
                $stmt->execute([
                    $newId,
                    $input['name'],
                    $input['type'] ?? 'file',
                    $input['content'] ?? '',
                    $parentId,
                    $nextOrder
                ]);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;
        
        case 'delete_growth_node':
            // 递归删除子节点
            function deleteGrowthNodeRecursive($pdo, $nodeId) {
                $stmt = $pdo->prepare('SELECT id FROM growth_nodes WHERE parent_id = ?');
                $stmt->execute([$nodeId]);
                $children = $stmt->fetchAll();
                foreach ($children as $child) {
                    deleteGrowthNodeRecursive($pdo, $child['id']);
                }
                $stmt = $pdo->prepare('DELETE FROM growth_nodes WHERE id = ?');
                $stmt->execute([$nodeId]);
            }
            deleteGrowthNodeRecursive($pdo, $id);
            echo json_encode(['success' => true]);
            break;
        
        case 'move_growth_node':
            $stmt = $pdo->prepare('UPDATE growth_nodes SET parent_id = ? WHERE id = ?');
            $stmt->execute([$input['parent_id'] ?? null, $id]);
            echo json_encode(['success' => true]);
            break;
        // ============ 文件夹 ============
        case 'get_folders':
            $stmt = $pdo->query('SELECT * FROM folders ORDER BY created_at ASC');
            echo json_encode($stmt->fetchAll());
            break;

        case 'save_folder':
            if ($id) {
                $stmt = $pdo->prepare('UPDATE folders SET name=? WHERE id=?');
                $stmt->execute([$input['name'], $id]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                $stmt = $pdo->prepare('INSERT INTO folders (id, name) VALUES (?,?)');
                $stmt->execute([$newId, $input['name']]);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;

        case 'delete_folder':
            $stmt = $pdo->prepare('UPDATE notes SET folder = "未分类" WHERE folder = (SELECT name FROM folders WHERE id = ?)');
            $stmt->execute([$id]);
            $stmt = $pdo->prepare('DELETE FROM folders WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // ============ 笔记 ============
        case 'get_notes':
            $stmt = $pdo->query('SELECT * FROM notes ORDER BY updated_at DESC');
            echo json_encode($stmt->fetchAll());
            break;

        case 'save_note':
            if ($id) {
                $stmt = $pdo->prepare('UPDATE notes SET title=?, content=?, is_cornell=?, cue_content=?, summary=?, folder=? WHERE id=?');
                $stmt->execute([
                    $input['title'], $input['content'] ?? '', $input['is_cornell'] ?? 0,
                    $input['cue_content'] ?? '', $input['summary'] ?? '', $input['folder'] ?? '未分类', $id
                ]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                $stmt = $pdo->prepare('INSERT INTO notes (id, title, content, is_cornell, cue_content, summary, folder) VALUES (?,?,?,?,?,?,?)');
                $stmt->execute([
                    $newId, $input['title'], $input['content'] ?? '', $input['is_cornell'] ?? 0,
                    $input['cue_content'] ?? '', $input['summary'] ?? '', $input['folder'] ?? '未分类'
                ]);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;

        case 'delete_note':
            $stmt = $pdo->prepare('DELETE FROM notes WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // ============ 待办 ============
        case 'get_todos':
            $stmt = $pdo->query('SELECT * FROM todos ORDER BY FIELD(progress, "inprogress", "notstarted", "completed"), created_at DESC');
            echo json_encode($stmt->fetchAll());
            break;

        case 'save_todo':
            $progress = $input['progress'] ?? 'notstarted';
            if ($id) {
                $stmt = $pdo->prepare('UPDATE todos SET text=?, category=?, priority=?, due_date=?, reminder=?, end_time=?, notes=?, completed=?, progress=? WHERE id=?');
                $stmt->execute([
                    $input['text'], $input['category'] ?? '', $input['priority'] ?? 'medium',
                    $input['due_date'] ?? null, $input['reminder'] ?? null, $input['end_time'] ?? null,
                    $input['notes'] ?? '', $input['completed'] ?? 0, $progress, $id
                ]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                $stmt = $pdo->prepare('INSERT INTO todos (id, text, category, priority, due_date, reminder, end_time, notes, completed, progress) VALUES (?,?,?,?,?,?,?,?,?,?)');
                $stmt->execute([
                    $newId, $input['text'], $input['category'] ?? '', $input['priority'] ?? 'medium',
                    $input['due_date'] ?? null, $input['reminder'] ?? null, $input['end_time'] ?? null,
                    $input['notes'] ?? '', $input['completed'] ?? 0, $progress
                ]);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;

        case 'toggle_todo':
            $stmt = $pdo->prepare('UPDATE todos SET completed = NOT completed, progress = IF(completed = 0, "completed", "notstarted") WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        case 'delete_todo':
            $stmt = $pdo->prepare('DELETE FROM todos WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // ============ 面试记录 ============
        case 'get_interviews':
            $stmt = $pdo->query('SELECT * FROM interviews ORDER BY created_at DESC');
            echo json_encode($stmt->fetchAll());
            break;

        case 'save_interview':
            if ($id) {
                $stmt = $pdo->prepare('UPDATE interviews SET 
                    company=?, position=?, interview_date=?, location=?, salary=?, status=?, notes=?,
                    job_scope=?, mission=?, services=?, interview_script=?, strength=?, weakness=?, interview_question=?, question_to_ask=?
                    WHERE id=?');
                $stmt->execute([
                    $input['company'], $input['position'] ?? '', $input['interview_date'] ?? null,
                    $input['location'] ?? '', $input['salary'] ?? '', $input['status'] ?? 'preparing',
                    $input['notes'] ?? '',
                    $input['job_scope'] ?? '', $input['mission'] ?? '', $input['services'] ?? '',
                    $input['interview_script'] ?? '', $input['strength'] ?? '', $input['weakness'] ?? '',
                    $input['interview_question'] ?? '', $input['question_to_ask'] ?? '',
                    $id
                ]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                $stmt = $pdo->prepare('INSERT INTO interviews (
                    id, company, position, interview_date, location, salary, status, notes,
                    job_scope, mission, services, interview_script, strength, weakness, interview_question, question_to_ask
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
                $stmt->execute([
                    $newId, $input['company'], $input['position'] ?? '', $input['interview_date'] ?? null,
                    $input['location'] ?? '', $input['salary'] ?? '', $input['status'] ?? 'preparing', $input['notes'] ?? '',
                    $input['job_scope'] ?? '', $input['mission'] ?? '', $input['services'] ?? '',
                    $input['interview_script'] ?? '', $input['strength'] ?? '', $input['weakness'] ?? '',
                    $input['interview_question'] ?? '', $input['question_to_ask'] ?? ''
                ]);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;

        case 'delete_interview':
            $stmt = $pdo->prepare('DELETE FROM interviews WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // ============ 个人资料 ============
        case 'get_profiles':
            $stmt = $pdo->query('SELECT * FROM profiles ORDER BY updated_at DESC');
            echo json_encode($stmt->fetchAll());
            break;

        case 'save_profile':
            $folder = $input['folder'] ?? '未分类';
            $filePath = $input['file_path'] ?? null;
            if ($id) {
                $stmt = $pdo->prepare('UPDATE profiles SET title=?, icon=?, content=?, folder=?, file_path=? WHERE id=?');
                $stmt->execute([$input['title'], $input['icon'] ?? '📄', $input['content'] ?? '', $folder, $filePath, $id]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                $stmt = $pdo->prepare('INSERT INTO profiles (id, title, icon, content, folder, file_path) VALUES (?,?,?,?,?,?)');
                $stmt->execute([$newId, $input['title'], $input['icon'] ?? '📄', $input['content'] ?? '', $folder, $filePath]);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;

        case 'delete_profile':
            $stmt = $pdo->prepare('DELETE FROM profiles WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // ============ 文件上传 ============
        case 'upload_file':
            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['error' => '没有收到文件']);
                break;
            }
            
            $file = $_FILES['file'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $errors = [
                    UPLOAD_ERR_INI_SIZE => '文件超过服务器限制 (' . ini_get('upload_max_filesize') . ')',
                    UPLOAD_ERR_FORM_SIZE => '文件超过表单限制',
                    UPLOAD_ERR_PARTIAL => '文件只上传了一部分',
                    UPLOAD_ERR_NO_FILE => '没有选择文件',
                    UPLOAD_ERR_NO_TMP_DIR => '服务器缺少临时文件夹',
                    UPLOAD_ERR_CANT_WRITE => '写入磁盘失败',
                    UPLOAD_ERR_EXTENSION => 'PHP 扩展阻止了上传',
                ];
                $errorMsg = $errors[$file['error']] ?? '未知错误 (' . $file['error'] . ')';
                http_response_code(500);
                echo json_encode(['error' => '上传失败: ' . $errorMsg]);
                break;
            }
            
            // 20MB 上限
            $maxSize = 20 * 1024 * 1024;
            if ($file['size'] > $maxSize) {
                http_response_code(400);
                echo json_encode(['error' => '文件太大，最大允许 20MB']);
                break;
            }
            
            $uploadDir = 'uploads/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            // 生成安全文件名
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $fileName = time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
            $targetPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($file['tmp_name'], $targetPath)) {
                echo json_encode(['success' => true, 'file_path' => $targetPath]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => '保存失败，请检查 uploads 文件夹权限']);
            }
            break;

        // ============ 好去处 ============
        case 'get_places':
            $stmt = $pdo->query('SELECT * FROM places ORDER BY updated_at DESC');
            echo json_encode($stmt->fetchAll());
            break;

        case 'save_place':
            if ($id) {
                $stmt = $pdo->prepare('UPDATE places SET name=?, type=?, rating=?, address=?, notes=? WHERE id=?');
                $stmt->execute([$input['name'], $input['type'] ?? 'other', $input['rating'] ?? 0, $input['address'] ?? '', $input['notes'] ?? '', $id]);
                echo json_encode(['success' => true, 'id' => $id]);
            } else {
                $newId = generateId();
                $stmt = $pdo->prepare('INSERT INTO places (id, name, type, rating, address, notes) VALUES (?,?,?,?,?,?)');
                $stmt->execute([$newId, $input['name'], $input['type'] ?? 'other', $input['rating'] ?? 0, $input['address'] ?? '', $input['notes'] ?? '']);
                echo json_encode(['success' => true, 'id' => $newId]);
            }
            break;

        case 'delete_place':
            $stmt = $pdo->prepare('DELETE FROM places WHERE id=?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => '未知操作']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => '操作失败: ' . $e->getMessage()]);
}
?>
