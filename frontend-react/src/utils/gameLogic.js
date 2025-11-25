/**
 * Word Generator and Game Logic
 * Handles word generation, difficulty scaling, and game session management
 */

// Word pools organized by difficulty
export const WORD_POOLS = {
    easy: [
        'cat', 'dog', 'sun', 'run', 'hat', 'ball', 'tree', 'fish', 'bird', 'moon',
        'star', 'book', 'hand', 'food', 'love', 'time', 'home', 'play', 'jump', 'sing',
        'blue', 'pink', 'help', 'read', 'write', 'walk', 'talk', 'door', 'wall', 'rose',
        'snow', 'rain', 'wind', 'fire', 'water', 'earth', 'leaf', 'seed', 'rock', 'wave',
        'sand', 'lake', 'hill', 'road', 'path', 'gate', 'desk', 'lamp', 'sock', 'shoe',
        'cup', 'bed', 'car', 'bus', 'toy', 'pen', 'bag', 'box', 'key', 'note',
        'bug', 'ant', 'cow', 'pig', 'goat', 'frog', 'duck', 'owl', 'bee', 'hen',
        'boy', 'girl', 'kid', 'baby', 'mom', 'dad', 'aunt', 'uncle', 'gran', 'friend',
        'soft', 'hard', 'warm', 'cold', 'dry', 'wet', 'fast', 'slow', 'loud', 'quiet',
        'park', 'farm', 'yard', 'shop', 'city', 'town', 'room', 'hall', 'kitchen', 'garden',
        'cake', 'rice', 'meat', 'milk', 'tea', 'juice', 'fruit', 'plant', 'corn', 'beans',
        'chair', 'table', 'board', 'clock', 'phone', 'mouse', 'cable', 'paper', 'card', 'sharpener',
        'green', 'red', 'white', 'black', 'yellow', 'purple', 'brown', 'silver', 'gold', 'orange',
        'face', 'nose', 'ear', 'eye', 'foot', 'hair', 'arm', 'leg', 'chin', 'neck',
        'jump', 'run', 'kick', 'sit', 'stand', 'crawl', 'move', 'turn', 'clap', 'shake',
        'toycar', 'teddy', 'balloon', 'rocket', 'puzzle', 'blocks', 'rattle', 'drum', 'truck', 'plane',
        'cookie', 'bread', 'toast', 'soup', 'soda', 'chips', 'pizza', 'pasta', 'burger', 'candy',
        'bowl', 'plate', 'fork', 'spoon', 'knife', 'pan', 'pot', 'stove', 'sink', 'mirror',
        'river', 'pond', 'shore', 'beach', 'field', 'trail', 'forest', 'woods', 'bridge', 'stone',
        'cloud', 'storm', 'fog', 'mist', 'shine', 'heat', 'chill', 'freeze', 'breeze', 'flame',
        'month', 'week', 'day', 'night', 'hour', 'minute', 'second', 'today', 'yesterday', 'tomorrow',
        'game', 'win', 'lose', 'score', 'level', 'point', 'goal', 'team', 'match', 'playground',
        'doll', 'rope', 'swing', 'slide', 'sandbox', 'pump', 'button', 'string', 'tape', 'glue',
        'cabin', 'tent', 'camp', 'firewood', 'marshmallow', 'picnic', 'blanket', 'pillow', 'basket', 'snack',
        'birdsong', 'sunlight', 'shadow', 'footstep', 'raindrop', 'snowflake', 'pebble', 'twig', 'branch', 'breeze',
        'cereal', 'cheese', 'butter', 'jam', 'honey', 'yogurt', 'salad', 'smoothie', 'cookie', 'cracker',
        'train', 'track', 'station', 'ticket', 'signal', 'bridge', 'tunnel', 'engine', 'whistle', 'bell',
        'kitten', 'puppy', 'pony', 'calf', 'cub', 'foal', 'chick', 'fawn', 'bunny', 'hamster',
        'pencil', 'eraser', 'marker', 'crayon', 'ink', 'folder', 'notebook', 'stapler', 'ruler', 'brush',
        'grain', 'bread', 'sugar', 'salt', 'pepper', 'spice', 'oil', 'flour', 'yeast', 'dough',
        'riverbank', 'treehouse', 'playset', 'storybook', 'sidewalk', 'crossing', 'fence', 'gatehouse', 'mailbox', 'porch',
        'peach', 'grape', 'melon', 'berry', 'plum', 'pear', 'lime', 'fig', 'nut', 'seedling',
        'plants', 'soil', 'cliff', 'shoreline', 'canyon', 'meadow', 'orchard', 'grove', 'vine', 'bud',
        'lightbulb', 'switch', 'charger', 'speaker', 'screen', 'remote', 'router', 'tablet', 'cable', 'battery'
    ],
    medium: [
        'apple', 'house', 'river', 'cloud', 'table', 'chair', 'smile', 'happy', 'green', 'bread',
        'music', 'dance', 'light', 'sound', 'round', 'plant', 'tiger', 'horse', 'beach', 'ocean',
        'mountain', 'forest', 'garden', 'bridge', 'window', 'pocket', 'basket', 'bottle', 'button', 'carpet',
        'castle', 'cheese', 'cherry', 'cookie', 'cotton', 'dragon', 'circle', 'square', 'flower', 'finger',
        'gloves', 'hammer', 'island', 'jungle', 'kettle', 'ladder', 'lemon', 'marble', 'needle', 'orange',
        'planet', 'rocket', 'energy', 'pencil', 'camera', 'memory', 'basketball', 'kitchen', 'picture', 'people',
        'planet', 'shadow', 'animal', 'thunder', 'blanket', 'shelter', 'signal', 'whistle', 'compass', 'lantern',
        'branch', 'season', 'harvest', 'canyon', 'valley', 'desert', 'cactus', 'feather', 'advice', 'journey',
        'copper', 'silver', 'garden', 'breeze', 'motion', 'travel', 'leather', 'castle', 'anchor', 'ticket',
        'library', 'museum', 'harbor', 'market', 'festival', 'village', 'station', 'airport', 'harvest', 'lantern',
        'fabric', 'cotton', 'velvet', 'thread', 'canvas', 'helmet', 'pillow', 'blanket', 'bucket', 'carrier',
        'marvel', 'wonder', 'legend', 'memory', 'chapter', 'event', 'moment', 'reason', 'effort', 'victory',
        'continent', 'country', 'border', 'island', 'harbor', 'vessel', 'compass', 'anchor', 'voyage', 'captain',
        'branch', 'leaflet', 'sapling', 'orchard', 'pasture', 'grove', 'breeze', 'thicket', 'meadow', 'pathway',
        'dolphin', 'parrot', 'giraffe', 'gazelle', 'panther', 'falcon', 'beetle', 'python', 'lioness', 'stallion',
        'raindrop', 'sunbeam', 'moonlight', 'thunder', 'twilight', 'sunrise', 'sunset', 'rainfall', 'snowstorm', 'hailstone',
        'crystal', 'mineral', 'granite', 'marble', 'copper', 'carbon', 'sulfur', 'quartz', 'opal', 'topaz',
        'engineer', 'artist', 'builder', 'driver', 'teacher', 'student', 'sailor', 'pilot', 'farmer', 'miner',
        'harp', 'violin', 'guitar', 'trumpet', 'drummer', 'cellist', 'singer', 'pianist', 'flutist', 'composer',
        'harvest', 'winter', 'summer', 'autumn', 'spring', 'evening', 'morning', 'midday', 'midnight', 'holiday',
        'circuit', 'battery', 'sensor', 'module', 'wireless', 'network', 'signal', 'adapter', 'voltage', 'current',
        'tunnel', 'station', 'railway', 'platform', 'terminal', 'ticketing', 'conductor', 'passenger', 'engine', 'carriage',
        'pepper', 'vinegar', 'tomato', 'onion', 'cabbage', 'spinach', 'ginger', 'garlic', 'mustard', 'saffron',
        'notebook', 'stapler', 'marker', 'highlighter', 'folder', 'binder', 'journal', 'calendar', 'clipboard', 'printer'
    ],
    hard: [
        'adventure', 'brilliant', 'challenge', 'dangerous', 'elephant', 'fantastic', 'geography', 'hurricane', 'important', 'jubilant',
        'knowledge', 'landscape', 'mysterious', 'necessary', 'octopus', 'parliament', 'question', 'rainbow', 'skeleton', 'telescope',
        'umbrella', 'velocity', 'wonderful', 'xylophone', 'yesterday', 'zeppelin', 'beautiful', 'butterfly', 'crocodile', 'dinosaur',
        'education', 'flamingo', 'giraffe', 'helicopter', 'incredible', 'jellyfish', 'kangaroo', 'lightning', 'magician', 'nighttime',
        'orchestra', 'penguin', 'qualified', 'raspberry', 'spaceship', 'trampoline', 'universe', 'valentine', 'waterfall', 'youngster',
        'algorithm', 'boundary', 'calendar', 'ceremony', 'citizenship', 'conclusion', 'container', 'conversion', 'creature', 'decision',
        'delivery', 'electricity', 'exception', 'fantasy', 'gallery', 'hardware', 'identity', 'judgment', 'keyboard', 'language',
        'landlord', 'landmark', 'manuscript', 'mechanism', 'movement', 'molecule', 'momentum', 'mountainous', 'narrative', 'oxygen',
        'particle', 'passenger', 'pharmacy', 'platform', 'population', 'position', 'resource', 'response', 'security', 'software',
        'solution', 'strategy', 'symbolic', 'tactical', 'terminal', 'tournament', 'treasure', 'variable', 'villager', 'visibility',
        'volunteer', 'warehouse', 'workshop', 'zookeeper', 'artistic', 'biologist', 'chemist', 'designer', 'engineer', 'explosion',
        'framework', 'governor', 'headline', 'historic', 'industry', 'invasion', 'landslide', 'laughter', 'marathon', 'maturity',
        'migration', 'military', 'minister', 'monument', 'mystical', 'northern', 'operator', 'painting', 'personal', 'powerful',
        'proposal', 'reaction', 'recovery', 'research', 'seasonal', 'standard', 'structure', 'survivor', 'tourism', 'training',
        'transport', 'tropical', 'vacation', 'warrior', 'wildlife', 'windstorm', 'airplane', 'astronaut', 'avalanche', 'bacterial',
        'beneath', 'boundary', 'division', 'eclipse', 'ecosystem', 'elasticity', 'enormous', 'foundation', 'glorious', 'heritage',
        'honestly', 'improper', 'jasmine', 'landfill', 'lifeboat', 'migration', 'notebook', 'password', 'pipeline', 'precious'
    ],
    expert: [
        'accomplishment', 'bibliography', 'circumstance', 'documentary', 'entrepreneur', 'fluorescent', 'governmental', 'headquarters', 'imaginative', 'jurisdiction',
        'kaleidoscope', 'legislative', 'metropolitan', 'neighborhood', 'optimization', 'philosophical', 'questionnaire', 'revolutionary', 'sophisticated', 'temperature',
        'undergraduate', 'vulnerability', 'whatsoever', 'extraordinary', 'zoological', 'achievement', 'breakthrough', 'characteristic', 'determination', 'fundamentally',
        'guaranteeing', 'humanitarian', 'incomprehensible', 'jeopardizing', 'knowledgeable', 'luxuriously', 'manufacturing', 'nevertheless', 'opportunities', 'parliamentary',
        'quantitative', 'relationship', 'supplementary', 'traditionally', 'understanding', 'visualization', 'wholehearted', 'zealousness', 'accelerated', 'bioengineering',
        'collaboration', 'cryptocurrency', 'cybersecurity', 'decentralized', 'differentiation', 'disproportionate', 'electromagnetic', 'environmental', 'experimental', 'geoengineering',
        'globalization', 'hypersensitive', 'illustration', 'implementation', 'institutional', 'intellectual', 'interpretation', 'jurisdictional', 'legalization', 'multiplication',
        'nanomaterials', 'neurological', 'optimization', 'pharmaceutical', 'physiological', 'planetarium', 'precipitation', 'psychological', 'recommendation', 'registration',
        'regulation', 'reinforcement', 'relativistic', 'representative', 'sensational', 'specialization', 'synchronization', 'telecommunication', 'transformation', 'ultrasonic',
        'verification', 'vocalization', 'vulnerable', 'artificially', 'biochemical', 'chronological', 'computational', 'concentration', 'confrontation', 'connectivity',
        'consciousness', 'constructive', 'contamination', 'controversial', 'coordination', 'corresponding', 'dramatically', 'effectiveness', 'extraordinary', 'fabrication',
        'formulation', 'heterogeneous', 'holographic', 'infrastructure', 'institutionalized', 'interdependent', 'interdisciplinary', 'microscopic', 'multidimensional', 'overwhelming',
        'paradoxically', 'perpendicular', 'philosophical', 'photosynthesis', 'proportionality', 'rehabilitation', 'revolutionizing', 'simultaneous', 'sustainability', 'thermodynamic'
    ]
};

export class WordGenerator {
    constructor() {
        this.usedWords = new Set();
        this.currentDifficulty = 'easy';
        this.survivalLevel = 0;
    }

    reset() {
        this.usedWords.clear();
        this.currentDifficulty = 'easy';
        this.survivalLevel = 0;
    }

    generateWords(count, difficulty = 'mixed') {
        const words = [];
        const availablePool = this._getWordPool(difficulty);

        if (count > availablePool.length) {
            return this._generateMixedWords(count);
        }

        const shuffled = this._shuffleArray([...availablePool]);

        for (let i = 0; i < count && i < shuffled.length; i++) {
            words.push(shuffled[i]);
        }

        return words;
    }

    generateSurvivalWords(level) {
        this.survivalLevel = level;
        const difficulty = this._getSurvivalDifficulty(level);
        const wordCount = this._getSurvivalWordCount(level);

        return this.generateWords(wordCount, difficulty);
    }

    _getSurvivalDifficulty(level) {
        if (level <= 3) return 'easy';
        if (level <= 6) return 'medium';
        if (level <= 9) return 'hard';
        return 'expert';
    }

    _getSurvivalWordCount(level) {
        return Math.min(5 + level, 15);
    }

    generateDailyChallenge(date) {
        const seed = this._hashString(date);
        const random = this._seededRandom(seed);

        const wordCount = 20 + Math.floor(random() * 31);
        const timeLimit = 60 + Math.floor(random() * 121);
        const difficulty = ['easy', 'medium', 'hard', 'expert'][Math.floor(random() * 4)];

        const words = this._generateSeededWords(wordCount, difficulty, seed);

        return {
            date,
            wordCount,
            timeLimit,
            difficulty,
            words,
            hash: this._hashString(date + wordCount + timeLimit)
        };
    }

    _generateSeededWords(count, difficulty, seed) {
        const random = this._seededRandom(seed);
        const pool = this._getWordPool(difficulty);
        const shuffled = this._seededShuffle([...pool], random);

        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    _getWordPool(difficulty) {
        if (difficulty === 'mixed') {
            return [
                ...WORD_POOLS.easy,
                ...WORD_POOLS.medium,
                ...WORD_POOLS.hard
            ];
        }
        return WORD_POOLS[difficulty] || WORD_POOLS.easy;
    }

    _generateMixedWords(count) {
        const allWords = Object.values(WORD_POOLS).flat();
        const shuffled = this._shuffleArray([...allWords]);
        return shuffled.slice(0, count);
    }

    _shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    _seededShuffle(array, random) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    _seededRandom(seed) {
        let value = seed;
        return function () {
            value = (value * 9301 + 49297) % 233280;
            return value / 233280;
        };
    }
}

export class GameSession {
    constructor(mode, config) {
        this.mode = mode;
        this.config = config;
        this.words = [];
        this.currentWordIndex = 0;
        this.typedWords = [];
        this.mistakes = 0;
        this.correctWords = 0;
        this.correctCharacters = 0;
        this.startTime = null;
        this.endTime = null;
        this.completed = false;
        this.wordGenerator = new WordGenerator();
        this.timerStarted = false;
    }

    initialize() {
        switch (this.mode) {
            case 'timeLimit':
                this.words = this.wordGenerator.generateWords(100, 'mixed');
                break;
            case 'wordCount':
                this.words = this.wordGenerator.generateWords(this.config.wordCount, 'mixed');
                break;
            case 'survival':
                this.words = this.wordGenerator.generateSurvivalWords(1);
                this.config.survivalLevel = 1;
                this.config.maxMistakes = 3;
                break;
            case 'dailyChallenge': {
                const challenge = this.wordGenerator.generateDailyChallenge(this.config.date);
                this.words = challenge.words;
                this.config.timeLimit = challenge.timeLimit;
                this.config.challengeHash = challenge.hash;
                break;
            }
            case 'paragraph':
                this.words = this.config.paragraphText.trim().split(' ');
                break;
            case 'practice':
                this.words = this.wordGenerator.generateWords(100, 'mixed');
                break;
        }
        // Start time will be set on first keystroke
    }

    typeWord(typedWord) {
        if (this.completed) {
            return { valid: false, reason: 'Game already completed' };
        }

        if (!this.timerStarted) {
            this.startTime = Date.now();
            this.timerStarted = true;
        }

        const expectedWord = this.words[this.currentWordIndex];
        const isCorrect = typedWord.trim().toLowerCase() === expectedWord.toLowerCase();

        this.typedWords.push({
            expected: expectedWord,
            typed: typedWord,
            correct: isCorrect,
            timestamp: Date.now(),
            characters: typedWord.length
        });

        if (isCorrect) {
            this.correctWords++;
            this.correctCharacters += expectedWord.length;
            this.currentWordIndex++;
        } else {
            this.mistakes++;
            if (this.mode === 'survival' && this.mistakes >= 3) {
                this.complete();
                return {
                    valid: true,
                    correct: false,
                    gameOver: true,
                    reason: 'Too many mistakes - Game Over!'
                };
            }
        }

        if (this.mode === 'wordCount' && this.currentWordIndex >= this.config.wordCount) {
            this.complete();
            return { valid: true, correct: isCorrect, completed: true };
        }

        if ((this.mode === 'dailyChallenge' || this.mode === 'paragraph') && this.currentWordIndex >= this.words.length) {
            this.complete();
            return { valid: true, correct: isCorrect, completed: true };
        }

        if (this.mode === 'survival' && this.currentWordIndex >= this.words.length) {
            this.config.survivalLevel++;
            const newWords = this.wordGenerator.generateSurvivalWords(this.config.survivalLevel);
            this.words.push(...newWords);
        }

        return {
            valid: true,
            correct: isCorrect,
            currentWord: this.words[this.currentWordIndex],
            progress: this.getProgress()
        };
    }

    complete() {
        this.completed = true;
        this.endTime = Date.now();
    }

    getProgress() {
        return {
            currentWordIndex: this.currentWordIndex,
            totalWords: (this.mode === 'timeLimit' || this.mode === 'practice') ? 'unlimited' : this.words.length,
            correctWords: this.correctWords,
            correctCharacters: this.correctCharacters,
            mistakes: this.mistakes,
            accuracy: this.calculateAccuracy(),
            timeElapsed: this.getElapsedTime()
        };
    }

    calculateAccuracy() {
        const totalTyped = this.typedWords.length;
        if (totalTyped === 0) return 100;
        return Math.round((this.correctWords / totalTyped) * 10000) / 100;
    }

    getElapsedTime() {
        if (!this.startTime) return 0;
        const end = this.endTime || Date.now();
        return (end - this.startTime) / 1000;
    }

    getStats() {
        const duration = this.getElapsedTime();
        const minutes = duration / 60;

        let correctCharacters = 0;

        this.typedWords.forEach(word => {
            const charCount = word.expected.length;
            if (word.correct) {
                correctCharacters += charCount;
            }
        });

        let wpm = 0;
        if (minutes > 0) {
            wpm = Math.round((correctCharacters / 5) / minutes);
        } else if (duration > 0) {
            wpm = Math.round((correctCharacters / 5) / (duration / 60));
        }

        return {
            mode: this.mode,
            wordsTyped: this.typedWords.length,
            correctWords: this.correctWords,
            mistakes: this.mistakes,
            accuracy: this.calculateAccuracy(),
            duration: Math.round(duration),
            wpm: Math.max(0, wpm),
            survivalLevel: this.config.survivalLevel || null,
            completed: this.completed,
            correctCharacters: correctCharacters
        };
    }

    getCurrentWord() {
        return this.words[this.currentWordIndex] || null;
    }

    getWordSetHash() {
        const wordsString = this.words.join(',');
        return this._hashString(wordsString);
    }

    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
    }
}
