import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product } from '../../../core/models/product.model';
import { Comment, CreateCommentDto } from '../../../core/models/comment.model';
import { ProductService } from '../../../core/services/product.service';
import { CommentService } from '../../../core/services/comment.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    LoadingSpinnerComponent, 
    StarRatingComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/products">Mahsulotlar</a>
        <span>/</span>
        <span class="current">{{ product?.name || 'Yuklanmoqda...' }}</span>
      </nav>

      <app-loading-spinner *ngIf="isLoading" message="Mahsulot ma'lumotlari yuklanmoqda..."></app-loading-spinner>

      <div *ngIf="!isLoading && product" class="detail-layout">
        <!-- Main Product Section -->
        <div class="product-showcase card">
          <div class="image-section">
            <img 
              *ngIf="product.image" 
              [src]="product.image" 
              [alt]="product.name" 
              class="main-img"
              (error)="product.image = ''"
            />
            <div *ngIf="!product.image" class="image-placeholder">
              <span>{{ product.name.charAt(0).toUpperCase() }}</span>
            </div>
          </div>

          <div class="info-section">
            <div class="rating-header">
              <app-star-rating [rating]="averageRating" [showValue]="true"></app-star-rating>
              <span class="reviews-count">({{ comments.length }} ta sharh)</span>
            </div>

            <h1 class="title">{{ product.name }}</h1>

            <div class="meta-row">
              <span class="stock-status" [class.in-stock]="product.quantity > 0" [class.out]="product.quantity <= 0">
                &#9679; {{ product.quantity > 0 ? ('Omborda mavjud: ' + product.quantity + ' dona') : 'Omborda tugagan' }}
              </span>
              <span class="branch-pill" *ngIf="product.companyBranchId">
                &#127970; Filial: #{{ product.companyBranchId }}
              </span>
            </div>

            <div class="price-box">
              <span class="price-val">{{ product.price | number:'1.0-0' }} so'm</span>
            </div>

            <div class="description-box">
              <h4 class="section-heading">Tavsif</h4>
              <p class="description-text">
                {{ product.description || "Ushbu mahsulot uchun qo'shimcha tavsif berilmagan." }}
              </p>
            </div>

            <!-- Add to Cart Flow (Faqat mijozlar uchun) -->
            <div class="purchase-box" *ngIf="authState.canUseCart()">
              <div class="quantity-picker">
                <button 
                  class="qty-btn" 
                  [disabled]="selectedQuantity <= 1"
                  (click)="selectedQuantity = selectedQuantity - 1"
                >-</button>
                <span class="qty-display">{{ selectedQuantity }}</span>
                <button 
                  class="qty-btn" 
                  [disabled]="selectedQuantity >= product.quantity"
                  (click)="selectedQuantity = selectedQuantity + 1"
                >+</button>
              </div>

              <button 
                class="btn btn-primary btn-lg add-btn"
                [disabled]="product.quantity <= 0 || isAddingToCart"
                (click)="addToCart()"
              >
                <span>&#128722;</span>
                <span>{{ addToCartBtnText }}</span>
              </button>
            </div>

            <!-- Admin bo'lsa xabar -->
            <div class="admin-notice-box" *ngIf="!authState.canUseCart()">
              <span class="admin-notice-badge">&#128737; Boshqaruvchi Rejimi</span>
              <p>Siz admin sifatida kirdingiz. Savat va xarid qilish faqat xaridorlar (mijozlar) uchun mo'ljallangan.</p>
            </div>
          </div>
        </div>

        <!-- Comments & Reviews Section -->
        <div class="comments-section card">
          <div class="comments-header">
            <div>
              <h2 class="comments-title">Xaridorlar Sharhlari</h2>
              <p class="comments-subtitle">Ushbu mahsulot haqida o'z fikringiz va bahoingizni qoldiring</p>
            </div>

            <div class="avg-rating-badge">
              <span class="big-rating">{{ averageRating | number:'1.1-1' }}</span>
              <div class="rating-sub">
                <app-star-rating [rating]="averageRating"></app-star-rating>
                <span class="out-of">5 dan</span>
              </div>
            </div>
          </div>

          <!-- Add Comment Form -->
          <div class="add-comment-card">
            <h4 class="form-title">Yangi sharh yozish</h4>
            <form [formGroup]="commentForm" (ngSubmit)="submitComment()">
              <div class="form-group">
                <label class="form-label">Bahoyingiz (1-5 yulduz) *</label>
                <app-star-rating 
                  [rating]="selectedStarRating" 
                  [readonly]="false" 
                  (ratingChange)="onRatingChange($event)"
                ></app-star-rating>
              </div>

              <div class="form-group">
                <label class="form-label">Fikringiz *</label>
                <textarea 
                  class="form-control" 
                  formControlName="content" 
                  rows="3" 
                  placeholder="Mahsulot sifati, yetkazib berilishi va taassurotlaringiz..."
                ></textarea>
                <div class="form-error" *ngIf="commentForm.get('content')?.touched && commentForm.get('content')?.invalid">
                  Sharh matni kamida 3 ta belgidan iborat bo'lishi kerak.
                </div>
              </div>

              <div class="form-submit-row">
                <span class="customer-info-note">
                  Izoh qoldiruvchi: <strong>#{{ authState.currentCustomerId() }}</strong>
                </span>
                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  [disabled]="commentForm.invalid || isSubmittingComment"
                >
                  {{ isSubmittingComment ? 'Yuborilmoqda...' : 'Sharhni yuborish' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Comments List -->
          <div class="comments-list">
            <app-empty-state 
              *ngIf="comments.length === 0"
              icon="&#128172;"
              title="Hali sharhlar yo'q"
              description="Ushbu mahsulotga birinchi bo'lib sharh qoldiring!"
            ></app-empty-state>

            <div class="comment-item" *ngFor="let comment of comments">
              <div class="comment-meta">
                <div class="user-avatar">
                  {{ (comment.userName || 'M').charAt(0).toUpperCase() }}
                </div>
                <div class="user-details">
                  <div class="user-name">{{ comment.userName || ('Mijoz #' + comment.userId) }}</div>
                  <div class="comment-date">{{ comment.createdAt | date:'mediumDate' }}</div>
                </div>
                <div class="comment-stars">
                  <app-star-rating [rating]="comment.starRating"></app-star-rating>
                </div>
              </div>

              <p class="comment-content">{{ comment.content }}</p>

              <button 
                *ngIf="authState.isAdminMode() || comment.userId === authState.currentCustomerId()" 
                class="delete-comment-btn"
                (click)="deleteComment(comment.id)"
                title="Sharhni o'chirish"
              >
                &times; O'chirish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }
    .breadcrumb a {
      color: var(--primary);
    }
    .breadcrumb .current {
      color: var(--text-main);
      font-weight: 600;
    }
    .detail-layout {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .product-showcase {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      padding: 2rem;
    }
    @media (max-width: 800px) {
      .product-showcase {
        grid-template-columns: 1fr;
      }
    }
    .image-section {
      width: 100%;
      height: 380px;
      border-radius: var(--radius-lg);
      overflow: hidden;
      background-color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
    }
    .main-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .image-placeholder {
      font-size: 6rem;
      font-weight: 800;
      color: var(--primary);
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .info-section {
      display: flex;
      flex-direction: column;
    }
    .rating-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .reviews-count {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
    .title {
      font-size: 1.875rem;
      font-weight: 800;
      color: var(--secondary);
      line-height: 1.25;
      margin-bottom: 0.75rem;
    }
    .meta-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .stock-status {
      font-size: 0.8125rem;
      font-weight: 700;
    }
    .stock-status.in-stock { color: var(--success); }
    .stock-status.out { color: var(--danger); }
    .branch-pill {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: var(--bg-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
    }
    .price-box {
      margin-bottom: 1.5rem;
    }
    .price-val {
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary);
    }
    .description-box {
      margin-bottom: 2rem;
    }
    .section-heading {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }
    .description-text {
      color: var(--secondary-light);
      line-height: 1.6;
      font-size: 0.9375rem;
    }
    .purchase-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: auto;
    }
    .quantity-picker {
      display: flex;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .qty-btn {
      width: 40px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      font-weight: 700;
      background: var(--bg-subtle);
      color: var(--text-main);
      transition: var(--transition);
    }
    .qty-btn:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .qty-display {
      width: 44px;
      text-align: center;
      font-weight: 700;
      font-size: 1rem;
    }
    .add-btn {
      flex: 1;
    }
    .admin-notice-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-top: auto;
    }
    .admin-notice-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #1e40af;
      background: #dbeafe;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      margin-bottom: 0.35rem;
    }
    .admin-notice-box p {
      font-size: 0.875rem;
      color: #334155;
      margin: 0;
      line-height: 1.4;
    }
    .comments-section {
      padding: 2rem;
    }
    .comments-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .comments-title {
      font-size: 1.375rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .comments-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .avg-rating-badge {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #fef3c7;
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-lg);
      border: 1px solid #fde68a;
    }
    .big-rating {
      font-size: 2rem;
      font-weight: 800;
      color: #b45309;
    }
    .out-of {
      font-size: 0.75rem;
      color: #92400e;
      display: block;
    }
    .add-comment-card {
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }
    .form-title {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: var(--secondary);
    }
    .form-submit-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .customer-info-note {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .comment-item {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border);
      position: relative;
    }
    .comment-item:last-child {
      border-bottom: none;
    }
    .comment-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.625rem;
    }
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
    }
    .user-name {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--text-main);
    }
    .comment-date {
      font-size: 0.75rem;
      color: var(--text-light);
    }
    .comment-stars {
      margin-left: auto;
    }
    .comment-content {
      font-size: 0.875rem;
      color: var(--secondary-light);
      line-height: 1.5;
    }
    .delete-comment-btn {
      position: absolute;
      bottom: 0.75rem;
      right: 0.75rem;
      font-size: 0.75rem;
      color: var(--danger);
      opacity: 0.7;
    }
    .delete-comment-btn:hover {
      opacity: 1;
      text-decoration: underline;
    }
  `]
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private commentService = inject(CommentService);
  private cartService = inject(CartService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  product: Product | null = null;
  comments: Comment[] = [];
  averageRating: number = 0;
  isLoading = true;

  selectedQuantity = 1;
  isAddingToCart = false;

  get addToCartBtnText(): string {
    return this.isAddingToCart ? "Qo'shilmoqda..." : "Savatga qo'shish";
  }

  selectedStarRating = 5;
  isSubmittingComment = false;
  commentForm!: FormGroup;

  ngOnInit(): void {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(3)]]
    });

    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        const id = parseInt(idStr, 10);
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: number): void {
    this.isLoading = true;
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.isLoading = false;
        this.loadComments(id);
        this.loadAverageRating(id);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadComments(productId: number): void {
    this.commentService.getByProductId(productId).subscribe({
      next: (comments) => (this.comments = comments || []),
      error: () => {}
    });
  }

  loadAverageRating(productId: number): void {
    this.commentService.getAverageRating(productId).subscribe({
      next: (avg) => (this.averageRating = avg || 0),
      error: () => {}
    });
  }

  onRatingChange(star: number): void {
    this.selectedStarRating = star;
  }

  addToCart(): void {
    if (!this.product) return;
    this.isAddingToCart = true;
    const customerId = this.authState.currentCustomerId();

    this.cartService.addItem(customerId, this.product.id, this.selectedQuantity).subscribe({
      next: () => {
        this.isAddingToCart = false;
        this.notification.success(`${this.selectedQuantity} ta "${this.product?.name}" savatga qo'shildi!`);
      },
      error: () => {
        this.isAddingToCart = false;
      }
    });
  }

  submitComment(): void {
    if (this.commentForm.invalid || !this.product) return;
    this.isSubmittingComment = true;

    // Context-based ProductId as mandated in brief:
    const dto: CreateCommentDto = {
      productId: this.product.id,
      userId: this.authState.currentCustomerId(),
      content: this.commentForm.value.content,
      starRating: this.selectedStarRating
    };

    this.commentService.create(dto).subscribe({
      next: (newComment) => {
        this.isSubmittingComment = false;
        this.notification.success("Sharhingiz qabul qilindi!");
        this.commentForm.reset();
        this.selectedStarRating = 5;
        this.loadComments(this.product!.id);
        this.loadAverageRating(this.product!.id);
      },
      error: () => {
        this.isSubmittingComment = false;
      }
    });
  }

  deleteComment(commentId: number): void {
    if (!confirm("Ushbu sharhni o'chirmoqchimisiz?")) return;

    this.commentService.delete(commentId).subscribe({
      next: () => {
        this.notification.success("Sharh o'chirildi.");
        this.comments = this.comments.filter(c => c.id !== commentId);
        if (this.product) {
          this.loadAverageRating(this.product.id);
        }
      },
      error: () => {}
    });
  }
}



