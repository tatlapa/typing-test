import {
  Component,
  signal,
  computed,
  effect,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface WordsData {
  words: string[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.html',
})
export class App implements OnDestroy, OnInit {
  // Game state
  protected readonly isGameStarted = signal(false);
  protected readonly isGameFinished = signal(false);
  protected readonly currentTime = signal(60); // 60 seconds
  protected readonly userInput = signal('');
  protected readonly currentWordIndex = signal(0);
  protected readonly startTime = signal<number | null>(null);
  protected readonly endTime = signal<number | null>(null);
  protected readonly mistakes = signal(0);
  protected readonly totalTyped = signal(0);
  protected readonly currentTimeRemaining = signal(60);

  // Timer interval
  private timerInterval: any;

  // Words list loaded from JSON
  private wordList: string[] = [];

  protected readonly currentText = signal('');
  protected readonly words = computed(() => this.currentText().split(' '));
  protected readonly currentWord = computed(
    () => this.words()[this.currentWordIndex()] || ''
  );
  protected readonly typedWords = computed(() =>
    this.userInput()
      .split(' ')
      .filter((word) => word.length > 0)
  );
  protected readonly correctWords = computed(() => {
    const typed = this.typedWords();
    const target = this.words();
    let correct = 0;
    for (let i = 0; i < Math.min(typed.length, target.length); i++) {
      if (typed[i] === target[i]) correct++;
    }
    return correct;
  });

  protected readonly accuracy = computed(() => {
    const total = this.totalTyped();
    if (total === 0) return 100;
    return Math.round(((total - this.mistakes()) / total) * 100);
  });

  constructor(private http: HttpClient) {
    // Auto-finish game when time runs out
    effect(() => {
      if (
        this.currentTimeRemaining() <= 0 &&
        this.isGameStarted() &&
        !this.isGameFinished()
      ) {
        this.finishGame();
      }
    });
  }

  ngOnInit() {
    this.loadWords();
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private loadWords() {
    this.http.get<WordsData>('/words.json').subscribe({
      next: (data) => {
        this.wordList = data.words;
        this.generateRandomText();
      },
      error: (error) => {
        console.error('Error loading words:', error);
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.isGameStarted() && !this.isGameFinished()) {
      this.startGame();
    }
  }

  protected startGame() {
    this.isGameStarted.set(true);
    this.startTime.set(Date.now());
    this.currentTimeRemaining.set(60);

    // Start timer
    this.timerInterval = setInterval(() => {
      if (this.isGameStarted() && !this.isGameFinished()) {
        const elapsed = (Date.now() - this.startTime()!) / 1000;
        const remaining = Math.max(0, 60 - elapsed);
        this.currentTimeRemaining.set(Math.ceil(remaining));

        if (remaining <= 0) {
          this.finishGame();
        }
      }
    }, 100);
  }

  protected finishGame() {
    this.isGameFinished.set(true);
    this.endTime.set(Date.now());
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  protected resetGame() {
    this.isGameStarted.set(false);
    this.isGameFinished.set(false);
    this.userInput.set('');
    this.currentWordIndex.set(0);
    this.startTime.set(null);
    this.endTime.set(null);
    this.mistakes.set(0);
    this.totalTyped.set(0);
    this.currentTimeRemaining.set(60);

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Generate new random text
    this.generateRandomText();
  }

  private generateRandomText() {
    if (this.wordList.length === 0) return;

    const wordCount = 100; // Generate 100 random words
    const randomWords = [];

    for (let i = 0; i < wordCount; i++) {
      const randomIndex = Math.floor(Math.random() * this.wordList.length);
      randomWords.push(this.wordList[randomIndex]);
    }

    this.currentText.set(randomWords.join(' '));
  }

  protected onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    // Start the game if it hasn't started yet
    if (!this.isGameStarted() && !this.isGameFinished() && value.length > 0) {
      this.startGame();
    }

    this.userInput.set(value);
    this.totalTyped.set(value.length);

    // Count mistakes
    const words = this.words();
    const typedWords = value.split(' ');
    let mistakeCount = 0;

    for (let i = 0; i < Math.min(typedWords.length, words.length); i++) {
      const typed = typedWords[i];
      const target = words[i];
      if (typed !== target) {
        mistakeCount += Math.abs(typed.length - target.length);
        for (let j = 0; j < Math.min(typed.length, target.length); j++) {
          if (typed[j] !== target[j]) mistakeCount++;
        }
      }
    }

    this.mistakes.set(mistakeCount);

    // Update current word index
    const spaceCount = (value.match(/ /g) || []).length;
    this.currentWordIndex.set(spaceCount);
  }

  protected onPaste(event: ClipboardEvent) {
    event.preventDefault();
    // Optionally show a warning message
    console.log('Paste is disabled in typing test');
  }

  protected onCopy(event: ClipboardEvent) {
    event.preventDefault();
    // Optionally show a warning message
    console.log('Copy is disabled in typing test');
  }

  protected onCut(event: ClipboardEvent) {
    event.preventDefault();
    // Optionally show a warning message
    console.log('Cut is disabled in typing test');
  }

  protected getWordClass(wordIndex: number): string {
    const typedWords = this.typedWords();
    const words = this.words();

    if (wordIndex < typedWords.length) {
      return typedWords[wordIndex] === words[wordIndex]
        ? 'correct'
        : 'incorrect';
    }

    if (wordIndex === this.currentWordIndex()) {
      return 'current';
    }

    return '';
  }
}
