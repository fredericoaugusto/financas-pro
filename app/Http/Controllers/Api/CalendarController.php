<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CalendarService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    protected $calendarService;

    public function __construct(CalendarService $calendarService)
    {
        $this->calendarService = $calendarService;
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start' => ['required', 'date'],
            'end' => ['required', 'date', 'after_or_equal:start'],
        ]);

        $start = Carbon::parse($request->start);
        $end = Carbon::parse($request->end);
        $userId = $request->user()->id;

        $events = $this->calendarService->getEvents($start, $end, $userId);

        // MVP: Balance projection disabled/placeholder for now
        // $balances = $this->calendarService->getDailyBalanceProjection($start, $end, $userId);

        return response()->json([
            'events' => $events,
            // 'balances' => $balances
        ]);
    }
}
