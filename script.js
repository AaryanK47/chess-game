/**
 * Pro Chess - Main Logic
 */

const BOARD_SIZE = 8;
const PIECES = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

// Initial board setup
const INITIAL_BOARD = [
    ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
    ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
    ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

class ChessGame {
    constructor() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.turn = 'w'; // 'w' or 'b'
        this.selectedSquare = null; // {r, c}
        this.validMoves = []; // Array of {r, c}
        this.history = [];
        this.isGameOver = false;

        // Castling rights
        this.castling = {
            w: { k: true, q: true }, // King side, Queen side
            b: { k: true, q: true }
        };

        // En passant target
        this.enPassantTarget = null; // {r, c} of the square behind the pawn that moved two steps

        this.dom = {
            board: document.getElementById('chessboard'),
            status: document.getElementById('gameStatus'),
            capturedWhite: document.getElementById('capturedWhite'),
            capturedBlack: document.getElementById('capturedBlack'),
            promotionModal: document.getElementById('promotionModal'),
            promotionOptions: document.getElementById('promotionOptions'),
            gameOverModal: document.getElementById('gameOverModal'),
            winnerText: document.getElementById('winnerText'),
            endReason: document.getElementById('endReason'),
            restartBtn: document.getElementById('restartBtn'),
            resetBtn: document.getElementById('resetGameBtn'),
            whitePlayer: document.querySelector('.white-player'),
            blackPlayer: document.querySelector('.black-player')
        };

        this.init();
    }

    init() {
        this.renderBoard();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.dom.restartBtn.addEventListener('click', () => this.resetGame());
        this.dom.resetBtn.addEventListener('click', () => this.resetGame());
    }

    resetGame() {
        this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
        this.turn = 'w';
        this.selectedSquare = null;
        this.validMoves = [];
        this.isGameOver = false;
        this.castling = { w: { k: true, q: true }, b: { k: true, q: true } };
        this.enPassantTarget = null;
        this.dom.gameOverModal.classList.add('hidden');
        this.updateStatus();
        this.renderBoard();
    }

    getPiece(r, c) {
        return this.board[r][c];
    }

    renderBoard() {
        this.dom.board.innerHTML = '';

        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const square = document.createElement('div');
                square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.r = r;
                square.dataset.c = c;

                const pieceCode = this.board[r][c];
                if (pieceCode) {
                    const color = pieceCode[0];
                    const type = pieceCode[1];
                    const pieceSpan = document.createElement('span');
                    pieceSpan.className = 'piece';
                }

                // Highlight valid moves
                const isMove = this.validMoves.find(m => m.r === r && m.c === c);
                if (isMove) {
                    if (pieceCode) {
                        square.classList.add('capture-move');
                    } else {
                        square.classList.add('valid-move');
                    }
                }

                square.addEventListener('click', () => this.handleSquareClick(r, c));
                this.dom.board.appendChild(square);
            }
        }
        this.updateStatus();
    }

    handleSquareClick(r, c) {
        if (this.isGameOver) return;

        const piece = this.getPiece(r, c);
        const isOwnPiece = piece && piece[0] === this.turn;

        // If clicking own piece, select it
        if (isOwnPiece) {
            this.selectedSquare = { r, c };
            this.calculateValidMoves(r, c);
            this.renderBoard();
            return;
        }

        // If a piece is selected and we click a valid move square, move there
        if (this.selectedSquare) {
            const move = this.validMoves.find(m => m.r === r && m.c === c);
            if (move) {
                this.makeMove(this.selectedSquare, { r, c });
            } else {
                // Deselect if clicking invalid square
                this.selectedSquare = null;
                this.validMoves = [];
                this.renderBoard();
            }
        }
    }

    calculateValidMoves(r, c, checkSafe = true) {
        const piece = this.getPiece(r, c);
        if (!piece) return [];

        const type = piece[1];
        const color = piece[0];
        let moves = [];

        // Logic for each piece type
        switch (type) {
            case 'p': moves = this.getPawnMoves(r, c, color); break;
            case 'r': moves = this.getSlidingMoves(r, c, [[0, 1], [0, -1], [1, 0], [-1, 0]]); break;
            case 'b': moves = this.getSlidingMoves(r, c, [[1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
            case 'q': moves = this.getSlidingMoves(r, c, [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]); break;
            case 'n': moves = this.getKnightMoves(r, c); break;
            case 'k': moves = this.getKingMoves(r, c, color, checkSafe); break;
        }

        // Filter moves that leave king in check
        if (checkSafe) {
            moves = moves.filter(move => {
                // Simulate move
                const originalPiece = this.board[move.r][move.c];
                const originalSource = this.board[r][c];

                this.board[move.r][move.c] = originalSource;
                this.board[r][c] = '';

                const inCheck = this.isKingInCheck(color);

                // Undo move
                this.board[r][c] = originalSource;
                this.board[move.r][move.c] = originalPiece;

                return !inCheck;
            });
        }

        this.validMoves = moves;
        return moves;
    }

    getPawnMoves(r, c, color) {
        const moves = [];
        const direction = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;

        // Forward 1
        if (this.isValidSquare(r + direction, c) && this.isEmpty(r + direction, c)) {
            moves.push({ r: r + direction, c: c });
            // Forward 2
            if (r === startRow && this.isValidSquare(r + 2 * direction, c) && this.isEmpty(r + 2 * direction, c)) {
                moves.push({ r: r + 2 * direction, c: c });
            }
        }

        // Captures
        const captureOffsets = [[direction, -1], [direction, 1]];
        for (const [dr, dc] of captureOffsets) {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidSquare(nr, nc)) {
                const target = this.getPiece(nr, nc);
                if (target && target[0] !== color) {
                    moves.push({ r: nr, c: nc });
                }
                // En Passant
                if (this.enPassantTarget && this.enPassantTarget.r === nr && this.enPassantTarget.c === nc) {
                    moves.push({ r: nr, c: nc, isEnPassant: true });
                }
            }
        }

        return moves;
    }

    getSlidingMoves(r, c, directions) {
        const moves = [];
        const color = this.getPiece(r, c)[0];

        for (const [dr, dc] of directions) {
            let nr = r + dr;
            let nc = c + dc;
            while (this.isValidSquare(nr, nc)) {
                const target = this.getPiece(nr, nc);
                if (!target) {
                    moves.push({ r: nr, c: nc });
                } else {
                    if (target[0] !== color) {
                        moves.push({ r: nr, c: nc });
                    }
                    break; // Blocked
                }
                nr += dr;
                nc += dc;
            }
        }
        return moves;
    }

    getKnightMoves(r, c) {
        const moves = [];
        const color = this.getPiece(r, c)[0];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dr, dc] of offsets) {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidSquare(nr, nc)) {
                const target = this.getPiece(nr, nc);
                if (!target || target[0] !== color) {
                    moves.push({ r: nr, c: nc });
                }
            }
        }
        return moves;
    }

    getKingMoves(r, c, color, checkSafe) {
        const moves = [];
        const offsets = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (const [dr, dc] of offsets) {
            const nr = r + dr;
            const nc = c + dc;
            if (this.isValidSquare(nr, nc)) {
                const target = this.getPiece(nr, nc);
                if (!target || target[0] !== color) {
                    moves.push({ r: nr, c: nc });
                }
            }
        }

        // Castling
        if (checkSafe && !this.isKingInCheck(color)) {
            // King side
            if (this.castling[color].k) {
                if (this.isEmpty(r, c + 1) && this.isEmpty(r, c + 2)) {
                    if (!this.isSquareAttacked(r, c + 1, color) && !this.isSquareAttacked(r, c + 2, color)) {
                        moves.push({ r: r, c: c + 2, isCastling: 'k' });
                    }
                }
            }
            // Queen side
            if (this.castling[color].q) {
                if (this.isEmpty(r, c - 1) && this.isEmpty(r, c - 2) && this.isEmpty(r, c - 3)) {
                    if (!this.isSquareAttacked(r, c - 1, color) && !this.isSquareAttacked(r, c - 2, color)) {
                        moves.push({ r: r, c: c - 2, isCastling: 'q' });
                    }
                }
            }
        }

        return moves;
    }

    isValidSquare(r, c) {
        return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
    }

    isEmpty(r, c) {
        return this.board[r][c] === '';
    }

    isKingInCheck(color) {
        // Find king
        let kr, kc;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c] === color + 'k') {
                    kr = r;
                    kc = c;
                    break;
                }
            }
        }
        // If king not found (shouldn't happen in normal game), return false
        if (kr === undefined) return false;

        return this.isSquareAttacked(kr, kc, color);
    }

    isSquareAttacked(r, c, color) {
        const opponentColor = color === 'w' ? 'b' : 'w';

        // Check all opponent pieces to see if they can attack (r, c)
        // Optimization: check from (r, c) outwards for sliding pieces, knights, pawns

        // 1. Pawn attacks
        const pawnDirection = color === 'w' ? -1 : 1; // Opponent pawns attack in opposite direction
        // Actually, if I am white, opponent is black, black pawns are at r-1.
        // Wait, if I am at r,c. Black pawn at r-1, c+/-1 attacks me.
        // Black pawns move +1 (down). So they attack from r-1.
        const opponentPawnRow = r - (opponentColor === 'w' ? -1 : 1);
        if (this.isValidSquare(opponentPawnRow, c - 1) && this.getPiece(opponentPawnRow, c - 1) === opponentColor + 'p') return true;
        if (this.isValidSquare(opponentPawnRow, c + 1) && this.getPiece(opponentPawnRow, c + 1) === opponentColor + 'p') return true;

        // 2. Knight attacks
        const knightOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of knightOffsets) {
            const nr = r + dr, nc = c + dc;
            if (this.isValidSquare(nr, nc) && this.getPiece(nr, nc) === opponentColor + 'n') return true;
        }

        // 3. King attacks
        const kingOffsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        for (const [dr, dc] of kingOffsets) {
            const nr = r + dr, nc = c + dc;
            if (this.isValidSquare(nr, nc) && this.getPiece(nr, nc) === opponentColor + 'k') return true;
        }

        // 4. Sliding pieces (Rook/Queen)
        const straightDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of straightDirs) {
            let nr = r + dr, nc = c + dc;
            while (this.isValidSquare(nr, nc)) {
                const target = this.getPiece(nr, nc);
                if (target) {
                    if (target === opponentColor + 'r' || target === opponentColor + 'q') return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        // 5. Sliding pieces (Bishop/Queen)
        const diagDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of diagDirs) {
            let nr = r + dr, nc = c + dc;
            while (this.isValidSquare(nr, nc)) {
                const target = this.getPiece(nr, nc);
                if (target) {
                    if (target === opponentColor + 'b' || target === opponentColor + 'q') return true;
                    break;
                }
                nr += dr;
                nc += dc;
            }
        }

        return false;
    }

    makeMove(from, to) {
        const piece = this.board[from.r][from.c];
        const target = this.board[to.r][to.c];
        const moveDetails = this.validMoves.find(m => m.r === to.r && m.c === to.c);

        // Handle En Passant Capture
        if (moveDetails && moveDetails.isEnPassant) {
            const captureRow = from.r; // The pawn being captured is on the same row as the start
            this.board[captureRow][to.c] = '';
            this.updateCapturedPieces(this.turn === 'w' ? 'bp' : 'wp');
        } else if (target) {
            this.updateCapturedPieces(target);
        }

        // Move piece
        this.board[to.r][to.c] = piece;
        this.board[from.r][from.c] = '';

        // Handle Castling Move
        if (moveDetails && moveDetails.isCastling) {
            if (moveDetails.isCastling === 'k') {
                // Move rook from h to f
                const rook = this.board[from.r][7];
                this.board[from.r][5] = rook;
                this.board[from.r][7] = '';
            } else if (moveDetails.isCastling === 'q') {
                // Move rook from a to d
                const rook = this.board[from.r][0];
                this.board[from.r][3] = rook;
                this.board[from.r][0] = '';
            }
        }

        // Update Castling Rights
        if (piece[1] === 'k') {
            this.castling[this.turn].k = false;
            this.castling[this.turn].q = false;
        } else if (piece[1] === 'r') {
            if (from.c === 0) this.castling[this.turn].q = false;
            if (from.c === 7) this.castling[this.turn].k = false;
        }
        // If rook is captured
        if (target && target[1] === 'r') {
            const opponent = this.turn === 'w' ? 'b' : 'w';
            if (to.c === 0) this.castling[opponent].q = false;
            if (to.c === 7) this.castling[opponent].k = false;
        }

        // Set En Passant Target
        if (piece[1] === 'p' && Math.abs(to.r - from.r) === 2) {
            this.enPassantTarget = { r: (from.r + to.r) / 2, c: from.c };
        } else {
            this.enPassantTarget = null;
        }

        // Pawn Promotion
        if (piece[1] === 'p' && (to.r === 0 || to.r === 7)) {
            this.showPromotionModal(to.r, to.c);
            return; // Wait for promotion selection
        }

        this.endTurn();
    }

    endTurn() {
        this.turn = this.turn === 'w' ? 'b' : 'w';
        this.selectedSquare = null;
        this.validMoves = [];

        // Check for Game Over
        if (this.checkGameOver()) {
            return;
        }

        this.renderBoard();
    }

    updateCapturedPieces(pieceCode) {
        const container = pieceCode[0] === 'w' ? this.dom.capturedWhite : this.dom.capturedBlack;
        const span = document.createElement('span');
        span.className = 'captured-piece';
        span.textContent = PIECES[pieceCode[0]][pieceCode[1]];
        span.style.color = pieceCode[0] === 'w' ? '#fff' : '#000';
        if (pieceCode[0] === 'b') span.style.textShadow = '0 0 2px #fff';
        container.appendChild(span);
    }

    checkGameOver() {
        // Check if current player has any valid moves
        let hasMoves = false;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (this.board[r][c][0] === this.turn) {
                    const moves = this.calculateValidMoves(r, c, true);
                    if (moves.length > 0) {
                        hasMoves = true;
                        break;
                    }
                }
            }
            if (hasMoves) break;
        }

        if (!hasMoves) {
            this.isGameOver = true;
            this.renderBoard(); // Re-render to show final state
            this.dom.gameOverModal.classList.remove('hidden');

            if (this.isKingInCheck(this.turn)) {
                this.dom.winnerText.textContent = `${this.turn === 'w' ? 'Black' : 'White'} Wins!`;
                this.dom.endReason.textContent = "Checkmate";
            } else {
                this.dom.winnerText.textContent = "Draw";
                this.dom.endReason.textContent = "Stalemate";
            }
            return true;
        }
        return false;
    }

    showPromotionModal(r, c) {
        this.dom.promotionModal.classList.remove('hidden');
        this.dom.promotionOptions.innerHTML = '';
        const pieces = ['q', 'r', 'b', 'n'];
        pieces.forEach(type => {
            const div = document.createElement('div');
            div.className = 'promotion-piece';
            div.textContent = PIECES[this.turn][type];
            div.onclick = () => this.promotePawn(r, c, type);
            this.dom.promotionOptions.appendChild(div);
        });
    }

    promotePawn(r, c, type) {
        this.board[r][c] = this.turn + type;
        this.dom.promotionModal.classList.add('hidden');
        this.endTurn();
    }

    updateStatus() {
        this.dom.status.textContent = `${this.turn === 'w' ? "White" : "Black"}'s Turn`;
        if (this.turn === 'w') {
            this.dom.whitePlayer.classList.add('active');
            this.dom.blackPlayer.classList.remove('active');
        } else {
            this.dom.whitePlayer.classList.remove('active');
            this.dom.blackPlayer.classList.add('active');
        }
    }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});
