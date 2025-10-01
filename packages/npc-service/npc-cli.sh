#!/bin/bash

# NPC Service CLI - Simple wrapper for NPC API calls
# Usage: ./npc-cli.sh <command> [args]

API_BASE="${NPC_API_BASE:-http://localhost:3002}"

show_help() {
    echo "NPC Service CLI"
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  health                           - Check service health"
    echo "  spawn [name] [maxOps]           - Spawn single miner NPC"
    echo "  spawn-multi <count> [maxOps]    - Spawn multiple miner NPCs"
    echo "  active | status                 - Show active NPCs"
    echo "  stats                           - Show NPC statistics"
    echo "  cleanup                         - Clean up completed NPCs"
    echo "  stop-all                        - Stop all NPCs"
    echo ""
    echo "Examples:"
    echo "  $0 spawn Miner-01 50"
    echo "  $0 spawn-multi 3 100"
    echo "  $0 active"
    echo ""
    echo "Environment:"
    echo "  NPC_API_BASE - API base URL (default: http://localhost:3002)"
}

case $1 in
    "health")
        echo "🔍 Checking NPC service health..."
        curl -s "$API_BASE/health" | jq . 2>/dev/null || curl -s "$API_BASE/health"
        ;;

    "spawn")
        name=${2:-"Miner-$(date +%s)"}
        maxOps=${3:-100}
        echo "🚀 Spawning miner NPC: $name (max operations: $maxOps)"
        curl -s -X POST "$API_BASE/npcs/spawn/miner" \
            -H "Content-Type: application/json" \
            -d "{\"name\": \"$name\", \"maxOperations\": $maxOps}" | \
            jq . 2>/dev/null || curl -s -X POST "$API_BASE/npcs/spawn/miner" \
            -H "Content-Type: application/json" \
            -d "{\"name\": \"$name\", \"maxOperations\": $maxOps}"
        ;;

    "spawn-multi")
        count=${2:-1}
        maxOps=${3:-100}
        if [ "$count" -lt 1 ] || [ "$count" -gt 50 ]; then
            echo "❌ Error: Count must be between 1 and 50"
            exit 1
        fi
        echo "🚀 Spawning $count miner NPCs (max operations: $maxOps each)"
        curl -s -X POST "$API_BASE/npcs/spawn/miners" \
            -H "Content-Type: application/json" \
            -d "{\"count\": $count, \"maxOperations\": $maxOps}" | \
            jq . 2>/dev/null || curl -s -X POST "$API_BASE/npcs/spawn/miners" \
            -H "Content-Type: application/json" \
            -d "{\"count\": $count, \"maxOperations\": $maxOps}"
        ;;

    "active" | "status")
        echo "📊 Active NPCs:"
        curl -s "$API_BASE/npcs/active" | jq . 2>/dev/null || curl -s "$API_BASE/npcs/active"
        ;;

    "stats")
        echo "📈 NPC Statistics:"
        curl -s "$API_BASE/npcs/stats" | jq . 2>/dev/null || curl -s "$API_BASE/npcs/stats"
        ;;

    "cleanup")
        echo "🧹 Cleaning up completed NPCs..."
        curl -s -X POST "$API_BASE/npcs/cleanup" | jq . 2>/dev/null || curl -s -X POST "$API_BASE/npcs/cleanup"
        ;;

    "stop-all")
        echo "🛑 Stopping all NPCs..."
        curl -s -X POST "$API_BASE/npcs/stop-all" | jq . 2>/dev/null || curl -s -X POST "$API_BASE/npcs/stop-all"
        ;;

    "help" | "-h" | "--help" | "")
        show_help
        ;;

    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""