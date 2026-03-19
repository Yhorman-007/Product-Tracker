from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..core import security
from ..schemas.token import Token
from ..schemas.user import User as UserSchema, UserCreate, PasswordResetRequest, PasswordReset
from ..services.email_service import send_recovery_email

router = APIRouter()
print("--- [AUTH] Router Initialized ---")

# Este endpoint procesa el inicio de sesión del usuario y le otorga un token de acceso JWT temporal
@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, retrieve an access token for future requests
    """
    print(f"DEBUG LOGIN: Starting for user '{form_data.username}'")
    username = form_data.username.strip()
    user = db.query(User).filter(User.username == username).first()
    
    if not user:
        print(f"DEBUG LOGIN: Usuario '{username}' NO encontrado en DB")
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    print(f"DEBUG LOGIN: Usuario encontrado. Email: {user.email}")
    print(f"DEBUG LOGIN: Hash en DB: {user.hashed_password}")
    
    # Manual verification for debug
    is_valid = security.verify_password(form_data.password, user.hashed_password)
    print(f"DEBUG LOGIN: Password valid?: {is_valid}")
    
    if not is_valid:
        print(f"DEBUG LOGIN: Fallo en verify_password para '{form_data.username}'")
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    if not user.is_active:
        print(f"DEBUG LOGIN: Usuario inactivo: {form_data.username}")
        raise HTTPException(status_code=400, detail="Inactive user")
    
    print(f"DEBUG LOGIN: EXITO para usuario: {form_data.username}")
    access_token_expires = timedelta(minutes=security.settings.access_token_expire_minutes)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

# Este endpoint permite registrar un nuevo usuario en el sistema de forma pública
@router.post("/signup", response_model=UserSchema)
def signup(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """
    Public signup endpoint
    """
    username = user_in.username.strip()
    email = user_in.email.strip()
    print(f"DEBUG: Intentando registrarlos: {username} ({email})")
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            print(f"DEBUG: El usuario ya existe: {username}")
            raise HTTPException(
                status_code=400,
                detail=f"The user with username '{username}' already exists.",
            )
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"DEBUG: El email ya existe: {email}")
            raise HTTPException(
                status_code=400,
                detail=f"The user with email '{email}' already exists.",
            )
        
        db_obj = User(
            username=username,
            email=email,
            hashed_password=security.get_password_hash(user_in.password),
            full_name=user_in.full_name,
            is_active=True,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        print(f"DEBUG: Registro exitoso para: {user_in.username}")
        return db_obj
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR en signup:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor durante el registro: {str(e)}"
        )

# Este endpoint maneja la solicitud de recuperación de contraseña y envía un correo con el token
@router.post("/password-recovery")
def recover_password(request: PasswordResetRequest, db: Session = Depends(get_db)) -> Any:
    """
    Password recovery endpoint
    """
    print(f"--- [REQUEST] Incoming recovery request for: {request.email} ---")
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist.",
        )
    
    # Generate a recovery token (valid for 30 min)
    password_reset_token = security.create_access_token(
        user.email, expires_delta=timedelta(minutes=30)
    )
    
    try:
        # REAL SMTP GMAIL ACTIVATION (Phase 1)
        success, message = send_recovery_email(email_to=user.email, token=password_reset_token)
        
        if success:
            print(f"[SUCCESS] Email enviado satisfactoriamente a: {user.email}")
            return {"status": "success", "message": "Email de recuperacion enviado. Revisa tu bandeja de entrada."}
        else:
            print(f"[SMTP FAIL] Detalle: {message}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
    except Exception as e:
        print(f"[ERROR FATAL]: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal Server Error: {str(e)}"
        )

# Este endpoint restablece la contraseña evaluando la validez del token recibido por correo
@router.post("/reset-password")
def reset_password(request: PasswordReset, db: Session = Depends(get_db)) -> Any:
    """
    Reset password endpoint
    """
    try:
        from jose import jwt
        payload = jwt.decode(
            request.token, security.settings.secret_key, algorithms=[security.settings.algorithm]
        )
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.hashed_password = security.get_password_hash(request.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password updated successfully."}
