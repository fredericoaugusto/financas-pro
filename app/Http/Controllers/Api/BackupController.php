<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BackupExportService;
use App\Services\BackupImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class BackupController extends Controller
{
    public function __construct(
        private BackupExportService $exportService,
        private BackupImportService $importService
    ) {
    }

    /**
     * Export complete backup as JSON.
     */
    public function export(): JsonResponse
    {
        $userId = Auth::id();
        $backup = $this->exportService->generateBackup($userId);

        $filename = 'financaspro_backup_' . Carbon::now()->format('Y-m-d_His') . '.json';

        return response()->json($backup)
            ->header('Content-Disposition', "attachment; filename=\"{$filename}\"")
            ->header('Content-Type', 'application/json');
    }

    /**
     * Preview backup before restore (validate structure).
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimetypes:application/json,text/plain|max:51200', // 50MB max
        ]);

        $file = $request->file('file');
        $content = file_get_contents($file->getPathname());
        $backup = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'valid' => false,
                'errors' => ['Arquivo JSON inválido: ' . json_last_error_msg()],
                'preview' => null,
            ], 422);
        }

        $result = $this->importService->validateAndPreview($backup);

        return response()->json($result, $result['valid'] ? 200 : 422);
    }

    /**
     * Restore backup (destructive - replaces all data).
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimetypes:application/json,text/plain|max:51200',
            'confirm' => 'required|boolean|accepted',
        ]);

        $file = $request->file('file');
        $content = file_get_contents($file->getPathname());
        $backup = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'success' => false,
                'message' => 'Arquivo JSON inválido: ' . json_last_error_msg(),
            ], 422);
        }

        $userId = Auth::id();
        $result = $this->importService->restore($userId, $backup);

        return response()->json($result, $result['success'] ? 200 : 422);
    }
}
